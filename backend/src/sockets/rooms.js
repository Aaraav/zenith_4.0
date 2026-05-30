// @ts-check
const { getMatchmakingStore } = require('../services/matchmakingStore');
const { logger } = require('../config/logger');
const { safeHandler } = require('./safeHandler');
const { evaluateSubmissions } = require('../services/gemini');
const { applyEvaluationAtomically } = require('../services/rating');
const { runCode } = require('../services/compiler');
const { outputsMatch } = require('../utils/testOutput');
const { ensureRoom, normalizeRoom } = require('../utils/roomId');

/** @type {Set<string>} */
const submitInFlight = new Set();

function registerRoomEvents(io, socket) {
  const store = getMatchmakingStore();

  socket.on(
    'joinRoom',
    safeHandler('joinRoom', async function ({ roomId }) {
      if (!roomId) return;
      // Always join the socket.io room first so relayed events (chat, code, etc.)
      // reach this client even if room state has been cleared.
      socket.join(roomId);

      const username = socket.data.username;
      const room = await store.getRoom(roomId);
      if (!room || !room.users[username]) {
        logger.warn({ event: 'joinRoom-no-state', roomId, username }, 'Room state missing, but socket.io room joined');
        return;
      }
      await store.updateRoom(roomId, (r) => { r.users[username].socketId = socket.id; });
      const freshRoom = await store.getRoom(roomId) || room;
      const opponent = username === freshRoom.user1 ? freshRoom.user2 : freshRoom.user1;
      logger.info({ event: 'room-resync', roomId, username }, 'User re-synced in room');
      socket.emit('roomState', {
        myCode: freshRoom.users[username]?.code ?? '',
        opponentCode: freshRoom.users[opponent]?.code ?? '',
        hasSubmitted: !!freshRoom.users[username]?.hasSubmitted,
        opponentHasSubmitted: !!freshRoom.users[opponent]?.hasSubmitted,
      });
      if (freshRoom.question) {
        socket.emit('question-generated', {
          questionData: freshRoom.question,
          question: freshRoom.question.htmlContent, // backward compatibility
          timestamp: new Date().toISOString(),
          roomId,
          users: [freshRoom.user1, freshRoom.user2],
        });
      }
    }),
  );

  socket.on(
    'codeChange',
    safeHandler('codeChange', async function ({ roomId, code }) {
      const username = socket.data.username;
      const updated = await store.updateRoom(roomId, (r) => {
        if (r.users[username]) r.users[username].code = code;
      });
      if (updated) socket.to(roomId).emit('opponentCodeChange', { code });
    }),
  );

  socket.on(
    'submitCode',
    safeHandler('submitCode', async function ({ roomId, language, tabSwitches = 0, code: clientCode, questionData: clientQuestion }) {
      const username = socket.data.username;
      const submitKey = `${roomId}:${username}`;
      if (submitInFlight.has(submitKey)) {
        return;
      }
      submitInFlight.add(submitKey);

      try {
      const room = await ensureRoom(store, roomId, username, clientCode, clientQuestion);
      if (!room) {
        socket.emit('submissionResult', {
          success: false,
          message: 'Match session expired. Return to the lobby and start a new match.',
        });
        return;
      }

      const code = clientCode || room.users[username].code;
      const hiddenTests = room.question?.hiddenTestCases || [];
      
      logger.info({ event: 'code-submitting', roomId, username }, 'Running hidden tests');
      io.to(roomId).emit('statusUpdate', { message: `${username} is submitting...` });

      // Run hidden tests
      let passed = 0;
      for (let i = 0; i < hiddenTests.length; i++) {
        const tc = hiddenTests[i];
        try {
          const res = await runCode(language, code, tc.input, room.question?.entryPoint || null);
          const out = (res.stdout || res.output || "").trim();
          const expected = (tc.output || "").trim();
          const err = res.stderr || res.error || "";
          
          if (err || !outputsMatch(out, expected)) {
            socket.emit('submissionResult', { 
              success: false, 
              message: `Test ${i+1} Failed.\nInput: ${tc.input}\nExpected: ${expected}\nGot: ${out || err}` 
            });
            io.to(roomId).emit('statusUpdate', { message: `${username}'s submission failed a test.` });
            return;
          }
          passed++;
          io.to(roomId).emit('testProgress', { username, passed, total: hiddenTests.length });
        } catch (err) {
          socket.emit('submissionResult', { success: false, message: `Execution Error on Test ${i+1}: ${err.message}` });
          io.to(roomId).emit('statusUpdate', { message: `${username}'s submission encountered an error.` });
          return;
        }
      }

      // If we got here, all hidden tests passed!
      const markSubmitted = (r) => {
        normalizeRoom(r, roomId);
        if (!r.users[username]) {
          r.users[username] = { socketId: socket.id, code: clientCode || '', hasSubmitted: false };
        }
        r.users[username].hasSubmitted = true;
        r.users[username].submitTime = Date.now();
        r.users[username].tabSwitches = tabSwitches;
        if (clientCode) r.users[username].code = clientCode;
      };

      let updatedRoom = await store.updateRoom(roomId, markSubmitted);
      if (!updatedRoom) {
        await ensureRoom(store, roomId, username, clientCode, clientQuestion);
        updatedRoom = await store.updateRoom(roomId, markSubmitted);
      }
      if (!updatedRoom) {
        socket.emit('submissionResult', {
          success: false,
          message: 'Could not save submission state. Please try again.',
        });
        return;
      }

      socket.emit('submissionResult', { success: true });
      logger.info({ event: 'code-submitted-success', roomId, username }, 'Code passed all hidden tests');
      
      const opponent = username === updatedRoom.user1 ? updatedRoom.user2 : updatedRoom.user1;
      socket.to(roomId).emit('opponentSubmitted', { username });

      if (!updatedRoom.users[opponent]?.hasSubmitted) {
        io.to(roomId).emit('statusUpdate', { message: `Waiting for ${opponent} to submit...` });
        return;
      }

      io.to(roomId).emit('statusUpdate', { message: 'Both users have submitted. Evaluating...' });

      try {
        const evalResult = await evaluateSubmissions({
          question: updatedRoom.question?.htmlContent || '',
          user1: updatedRoom.user1,
          code1: updatedRoom.users[updatedRoom.user1].code,
          time1: updatedRoom.users[updatedRoom.user1].submitTime - new Date(updatedRoom.createdAt).getTime(),
          tabs1: updatedRoom.users[updatedRoom.user1].tabSwitches,
          user2: updatedRoom.user2,
          code2: updatedRoom.users[updatedRoom.user2].code,
          time2: updatedRoom.users[updatedRoom.user2].submitTime - new Date(updatedRoom.createdAt).getTime(),
          tabs2: updatedRoom.users[updatedRoom.user2].tabSwitches,
        });
        
        const persisted = await applyEvaluationAtomically({
          roomId,
          room: updatedRoom,
          user1: updatedRoom.user1,
          user2: updatedRoom.user2,
          code1: updatedRoom.users[updatedRoom.user1].code,
          code2: updatedRoom.users[updatedRoom.user2].code,
          ...evalResult,
        });
        io.to(roomId).emit('evaluationComplete', persisted);
        await store.deleteRoom(roomId);
      } catch (err) {
        logger.error({ err, roomId }, 'Evaluation failed');
        io.to(roomId).emit('evaluationError', { message: 'Evaluation failed. Ratings unchanged.' });
      }
      } finally {
        submitInFlight.delete(submitKey);
      }
    }),
  );

  // Chat relay — forward to everyone else in the room.
  // Self-heal: ensure the sender is in the socket.io room before relaying.
  socket.on(
    'chat-message',
    safeHandler('chat-message', async function ({ roomId, from, text, ts }) {
      if (!roomId || !text) return;
      socket.join(roomId);
      socket.to(roomId).emit('chat-message', { from, text, ts });
    }),
  );

  socket.on('disconnect', async () => {
    try {
      const found = await store.findRoomBySocket(socket.id);
      if (!found) return;

      const { roomId, username: leaverName } = found;
      const room = await store.getRoom(roomId);
      
      // If the room doesn't exist, it might have just been evaluated and deleted normally
      if (!room) return;

      logger.info({ event: 'room-forfeit', roomId, leaverName }, 'Player abandoned match');

      const opponentName = leaverName === room.user1 ? room.user2 : room.user1;

      // Construct Forfeit Evaluation
      const leaverAnalysis = "You abandoned the match early.";
      const opponentAnalysis = "Your opponent fled the battle. Victory by default!";
      const leaverIsUser1 = room.user1 === leaverName;

      const persisted = await applyEvaluationAtomically({
        roomId,
        room,
        user1: room.user1,
        user2: room.user2,
        code1: room.users[room.user1].code,
        code2: room.users[room.user2].code,
        user1Analysis: leaverIsUser1 ? leaverAnalysis : opponentAnalysis,
        user2Analysis: leaverIsUser1 ? opponentAnalysis : leaverAnalysis,
        user1Increment: leaverIsUser1 ? -15 : 15,
        user2Increment: leaverIsUser1 ? 15 : -15,
        user1Improvements: leaverIsUser1 ? "Do not leave competitive matches early." : "Keep up the good work.",
        user2Improvements: leaverIsUser1 ? "Keep up the good work." : "Do not leave competitive matches early.",
        user1Strengths: leaverIsUser1 ? [] : ["Victory by forfeit"],
        user1Weaknesses: leaverIsUser1 ? ["Abandoned the match early"] : [],
        user2Strengths: leaverIsUser1 ? ["Victory by forfeit"] : [],
        user2Weaknesses: leaverIsUser1 ? [] : ["Abandoned the match early"],
        time1: room.users[room.user1].submitTime ? room.users[room.user1].submitTime - new Date(room.createdAt).getTime() : 0,
        time2: room.users[room.user2].submitTime ? room.users[room.user2].submitTime - new Date(room.createdAt).getTime() : 0,
      });

      // Emit evaluationComplete to the remaining player so they see the victory screen
      io.to(roomId).emit('evaluationComplete', persisted);
      
      await store.deleteRoom(roomId);
    } catch (e) {
      logger.error({ e }, 'Disconnect cleanup failed');
    }
  });
}

module.exports = { registerRoomEvents };
