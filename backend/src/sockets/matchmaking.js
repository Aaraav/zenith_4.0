// @ts-check
const { getMatchmakingStore } = require('../services/matchmakingStore');
const { logger } = require('../config/logger');
const { safeHandler } = require('./safeHandler');
const { generateQuestion } = require('../services/gemini');
const User = require('../../models/User');

const RATING_TOLERANCE = 150;

function registerMatchmaking(io, socket) {
  const store = getMatchmakingStore();

  socket.on(
    'joinQueue',
    safeHandler('joinQueue', async function ({ topic }) {
      // Identity comes from socket.data — we never trust client-supplied username/rating.
      const username = socket.data.username;
      const clerkId = socket.data.clerkId;
      if (!username) throw new Error('Socket missing identity');

      const userDoc = await User.findOne({ clerkId }).lean();
      if (!userDoc) throw new Error('User not found');
      const rating = userDoc.finalRating || 1000;

      const newUser = { socketId: socket.id, clerkId, username, topic: topic || 'DSA', rating };
      const match = await store.findMatch(newUser, RATING_TOLERANCE);

      if (!match) {
        await store.enqueue(newUser);
        socket.emit('queued', { topic: newUser.topic });
        return;
      }

      const user1 = match.username;
      const user2 = newUser.username;
      const roomId = `${user1}_${user2}_${Date.now()}`;

      const room = {
        user1,
        user2,
        question: null,
        topic: newUser.topic,
        createdAt: new Date(),
        users: {
          [user1]: { socketId: match.socketId, code: `// ${user1}'s code`, hasSubmitted: false },
          [user2]: { socketId: newUser.socketId, code: `// ${user2}'s code`, hasSubmitted: false },
        },
      };
      await store.createRoom(roomId, room);

      const matchSocket = io.sockets.sockets.get(match.socketId);
      if (matchSocket) matchSocket.join(roomId);
      socket.join(roomId);

      logger.info({ event: 'match-found', roomId, user1, user2 }, 'Match found');
      io.to(roomId).emit('roomJoined', { roomId, users: [user1, user2] });

      try {
        const avgRating = (rating + match.rating) / 2;
        const questionData = await generateQuestion(avgRating);
        await store.updateRoom(roomId, (r) => { r.question = questionData; });
        io.to(roomId).emit('question-generated', {
          questionData: questionData,
          question: questionData.htmlContent, // Keep for backward compatibility in UI temporarily
          timestamp: new Date().toISOString(),
          roomId,
          users: [user1, user2],
        });
      } catch (err) {
        logger.error({ err, roomId }, 'Question generation failed');
        io.to(roomId).emit('questionError', { error: 'Failed to generate question' });
      }
    }),
  );

  socket.on(
    'cancelQueue',
    safeHandler('cancelQueue', async function () {
      await store.dequeueBySocket(socket.id);
      socket.emit('queueCancelled');
    }),
  );

  socket.on('disconnect', async () => {
    try { await store.dequeueBySocket(socket.id); } catch (e) { /* ignore */ }
  });
}

module.exports = { registerMatchmaking };
