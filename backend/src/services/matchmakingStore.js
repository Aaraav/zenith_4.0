// @ts-check
const { getRedis } = require('../config/redis');
const { parseRoomJson, normalizeRoom } = require('../utils/roomId');
const { logger } = require('../config/logger');

/**
 * @typedef {{ socketId: string, clerkId: string, username: string, topic: string, rating: number }} QueuedUser
 * @typedef {{ user1: string, user2: string, question: string|null, topic: string, createdAt: Date, users: Object }} Room
 */

const ROOM_TTL_SECONDS = 60 * 60 * 2; // 2h safety net

// ----- In-memory implementation (single-instance dev fallback) -----
const memQueue = [];
const memRooms = new Map();

const inMemoryStore = {
  async enqueue(user) {
    memQueue.push(user);
  },
  async findMatch(user, ratingTolerance = 150) {
    const idx = memQueue.findIndex(
      (u) => u.topic === user.topic
        && Math.abs(u.rating - user.rating) <= ratingTolerance
        && u.username !== user.username,
    );
    if (idx === -1) return null;
    const [match] = memQueue.splice(idx, 1);
    return match;
  },
  async dequeueBySocket(socketId) {
    const idx = memQueue.findIndex((u) => u.socketId === socketId);
    if (idx !== -1) memQueue.splice(idx, 1);
  },
  async createRoom(roomId, room) {
    memRooms.set(roomId, room);
  },
  async getRoom(roomId) {
    return memRooms.get(roomId) || null;
  },
  async updateRoom(roomId, mutator) {
    const r = memRooms.get(roomId);
    if (!r) return null;
    mutator(r);
    return r;
  },
  async deleteRoom(roomId) {
    memRooms.delete(roomId);
  },
  async findRoomBySocket(socketId) {
    for (const [id, room] of memRooms.entries()) {
      const username = Object.keys(room.users).find((u) => room.users[u].socketId === socketId);
      if (username) return { roomId: id, room, username };
    }
    return null;
  },
};

// ----- Redis implementation -----
function redisStore(redis) {
  const queueKey = (topic) => `queue:${topic}`;
  const roomKey = (roomId) => `room:${roomId}`;

  return {
    async enqueue(user) {
      // ZADD score=rating member=JSON
      await redis.zadd(queueKey(user.topic), user.rating, JSON.stringify(user));
    },
    async findMatch(user, ratingTolerance = 150) {
      const min = user.rating - ratingTolerance;
      const max = user.rating + ratingTolerance;
      const candidates = await redis.zrangebyscore(queueKey(user.topic), min, max);
      for (const raw of candidates) {
        try {
          const candidate = JSON.parse(raw);
          if (candidate.username !== user.username) {
            const removed = await redis.zrem(queueKey(user.topic), raw);
            if (removed === 1) return candidate;
          }
        } catch (e) {
          logger.warn({ e: e.message, raw }, 'Failed to parse queue entry');
        }
      }
      return null;
    },
    async dequeueBySocket(socketId) {
      // Scan all topic queues. (Topic count is small in practice.)
      const keys = await redis.keys('queue:*');
      for (const k of keys) {
        const all = await redis.zrange(k, 0, -1);
        for (const raw of all) {
          try {
            const u = JSON.parse(raw);
            if (u.socketId === socketId) await redis.zrem(k, raw);
          } catch { /* ignore */ }
        }
      }
    },
    async createRoom(roomId, room) {
      await redis.set(roomKey(roomId), room, ROOM_TTL_SECONDS);
    },
    async getRoom(roomId) {
      const raw = await redis.get(roomKey(roomId));
      if (!raw) return null;
      const room = parseRoomJson(raw);
      return normalizeRoom(room, roomId);
    },
    async updateRoom(roomId, mutator) {
      const raw = await redis.get(roomKey(roomId));
      if (!raw) return null;
      const room = normalizeRoom(parseRoomJson(raw), roomId);
      if (!room) return null;
      mutator(room);
      await redis.set(roomKey(roomId), room, ROOM_TTL_SECONDS);
      return room;
    },
    async deleteRoom(roomId) {
      await redis.del(roomKey(roomId));
    },
    async findRoomBySocket(socketId) {
      const keys = await redis.keys('room:*');
      for (const k of keys) {
        const raw = await redis.get(k);
        if (!raw) continue;
        const roomId = k.replace(/^room:/, '');
        const room = normalizeRoom(parseRoomJson(raw), roomId);
        if (!room?.users) continue;
        const username = Object.keys(room.users || {}).find((u) => room.users[u].socketId === socketId);
        if (username) return { roomId: k.replace(/^room:/, ''), room, username };
      }
      return null;
    },
  };
}

function getMatchmakingStore() {
  const redis = getRedis();
  if (redis) return redisStore(redis);
  return inMemoryStore;
}

module.exports = { getMatchmakingStore };
