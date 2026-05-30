import { describe, it, expect, beforeEach, vi } from 'vitest';

// Force in-memory store for these tests by ensuring REDIS_URL is unset.
vi.mock('../src/config/redis.js', () => ({ getRedis: () => null }));

const { getMatchmakingStore } = await import('../src/services/matchmakingStore.js');

describe('in-memory matchmaking store', () => {
  let store;

  beforeEach(() => {
    store = getMatchmakingStore();
  });

  it('matches users within rating tolerance', async () => {
    const a = { socketId: 'a', clerkId: 'a', username: 'alice', topic: 'DSA', rating: 1200 };
    const b = { socketId: 'b', clerkId: 'b', username: 'bob', topic: 'DSA', rating: 1300 };
    await store.enqueue(a);
    const match = await store.findMatch(b, 150);
    expect(match?.username).toBe('alice');
  });

  it('does not match users outside rating tolerance', async () => {
    const a = { socketId: 'a2', clerkId: 'a', username: 'alice', topic: 'DSA', rating: 1000 };
    const b = { socketId: 'b2', clerkId: 'b', username: 'bob', topic: 'DSA', rating: 1500 };
    await store.enqueue(a);
    const match = await store.findMatch(b, 150);
    expect(match).toBeNull();
  });

  it('does not match same username to itself', async () => {
    const a = { socketId: 'a3', clerkId: 'a', username: 'alice', topic: 'DSA', rating: 1200 };
    const a2 = { socketId: 'a3-other', clerkId: 'a', username: 'alice', topic: 'DSA', rating: 1200 };
    await store.enqueue(a);
    const match = await store.findMatch(a2, 150);
    expect(match).toBeNull();
  });

  it('persists and retrieves rooms', async () => {
    const room = {
      user1: 'alice',
      user2: 'bob',
      question: null,
      topic: 'DSA',
      createdAt: new Date(),
      users: {
        alice: { socketId: 'a', code: '', hasSubmitted: false },
        bob: { socketId: 'b', code: '', hasSubmitted: false },
      },
    };
    await store.createRoom('r1', room);
    const fetched = await store.getRoom('r1');
    expect(fetched?.user1).toBe('alice');
    expect(fetched?.user2).toBe('bob');
  });

  it('finds room by socket id', async () => {
    const room = {
      user1: 'alice',
      user2: 'bob',
      question: null,
      topic: 'DSA',
      createdAt: new Date(),
      users: {
        alice: { socketId: 'sock-a', code: '', hasSubmitted: false },
        bob: { socketId: 'sock-b', code: '', hasSubmitted: false },
      },
    };
    await store.createRoom('r2', room);
    const found = await store.findRoomBySocket('sock-b');
    expect(found?.username).toBe('bob');
    expect(found?.roomId).toBe('r2');
  });
});
