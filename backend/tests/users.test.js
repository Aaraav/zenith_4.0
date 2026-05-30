import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

let app;
let User;

beforeAll(async () => {
  const mod = await import('../src/app.js');
  app = mod.createApp().app;
  User = mongoose.models.User;

  await User.deleteMany({});
  await User.create({
    clerkId: 'clerk-alice',
    username: 'alice',
    fullName: 'Alice Smith',
    email: 'alice@example.com',
    imageUrl: 'https://example.com/alice.png',
    createdAt: new Date('2024-01-15'),
    finalRating: 1350,
    platformUsernames: {
      codeforces: 'alice_cf',
      codechef: '',
      leetcode: 'alice_lc',
      codingninjas: '',
    },
  });
});

describe('GET /api/users/by-username/:username', () => {
  it('returns public profile without auth', async () => {
    const res = await request(app).get('/api/users/by-username/alice');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe('alice');
    expect(res.body.user.fullName).toBe('Alice Smith');
    expect(res.body.user.finalRating).toBe(1350);
    expect(res.body.user.platformUsernames.codeforces).toBe('alice_cf');
  });

  it('does not expose email or clerkId', async () => {
    const res = await request(app).get('/api/users/by-username/alice');
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.user.clerkId).toBeUndefined();
  });

  it('returns 404 for unknown username', async () => {
    const res = await request(app).get('/api/users/by-username/nobody');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('User not found');
  });
});
