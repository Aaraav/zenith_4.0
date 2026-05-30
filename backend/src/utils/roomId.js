/**
 * Parse roomId formatted as `${user1}_${user2}_${timestamp}`.
 * Usernames must not contain underscores (enforced at registration).
 * @param {string} roomId
 */
function parseRoomId(roomId) {
  const parts = String(roomId).split('_');
  if (parts.length < 3) return null;
  const timestamp = Number(parts[parts.length - 1]);
  if (!Number.isFinite(timestamp)) return null;
  const user2 = parts[parts.length - 2];
  const user1 = parts.slice(0, -2).join('_');
  if (!user1 || !user2) return null;
  return { user1, user2, timestamp };
}

/**
 * Rebuild in-memory room state when store lost it (e.g. server restart).
 * @param {ReturnType<import('../services/matchmakingStore').getMatchmakingStore>} store
 * @param {string} roomId
 * @param {string} username
 * @param {string} [clientCode]
 * @param {object} [clientQuestion]
 */
async function ensureRoom(store, roomId, username, clientCode, clientQuestion) {
  let room = await store.getRoom(roomId);

  if (room?.users?.[username]) {
    if (clientCode) room.users[username].code = clientCode;
    if (clientQuestion && !room.question) {
      await store.updateRoom(roomId, (r) => { r.question = clientQuestion; });
      room.question = clientQuestion;
    }
    return room;
  }

  const parsed = parseRoomId(roomId);
  if (!parsed || !clientQuestion?.hiddenTestCases?.length) return null;
  if (username !== parsed.user1 && username !== parsed.user2) return null;

  const { user1, user2, timestamp } = parsed;
  room = {
    user1,
    user2,
    question: clientQuestion,
    topic: clientQuestion.topic || 'DSA',
    createdAt: new Date(timestamp),
    users: {
      [user1]: {
        socketId: '',
        code: username === user1 ? (clientCode || '') : '',
        hasSubmitted: false,
      },
      [user2]: {
        socketId: '',
        code: username === user2 ? (clientCode || '') : '',
        hasSubmitted: false,
      },
    },
  };

  await store.createRoom(roomId, room);
  const verified = await store.getRoom(roomId);
  return verified?.users?.[username] ? verified : room;
}

function normalizeRoom(room, roomId) {
  if (!room || typeof room !== 'object') return null;
  const parsed = roomId ? parseRoomId(roomId) : null;
  if (!room.users || typeof room.users !== 'object') room.users = {};
  if (parsed) {
    for (const u of [parsed.user1, parsed.user2]) {
      if (!room.users[u]) {
        room.users[u] = { socketId: '', code: '', hasSubmitted: false };
      }
    }
  }
  if (room.createdAt && typeof room.createdAt === 'string') {
    room.createdAt = new Date(room.createdAt);
  }
  return room;
}

/**
 * Parse room JSON from Redis (handles legacy double-encoded values).
 * @param {string | object} raw
 */
function parseRoomJson(raw) {
  if (raw && typeof raw === 'object') return raw;
  let room = JSON.parse(String(raw));
  if (typeof room === 'string') room = JSON.parse(room);
  return room;
}

module.exports = { parseRoomId, ensureRoom, normalizeRoom, parseRoomJson };
