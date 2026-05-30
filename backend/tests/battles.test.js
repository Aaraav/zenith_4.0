import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

let app;
let BattleHistory;

beforeAll(async () => {
  const mod = await import('../src/app.js');
  app = mod.createApp().app;
  const battleMod = await import('../models/battleHistory.js');
  BattleHistory = battleMod.default || battleMod;

  // Seed 25 battles for "alice" so we can exercise pagination.
  await BattleHistory.deleteMany({});
  const docs = [];
  for (let i = 0; i < 25; i += 1) {
    docs.push({
      roomId: `r${i}`,
      question: BattleHistory.compressData(`<p>q${i}</p>`),
      questionCompressed: true,
      users: [
        {
          username: 'alice',
          code: BattleHistory.compressData('// a'),
          codeCompressed: true,
          finalRating: 1000 + i,
          ratingChange: i,
          analysis: 'ok',
        },
        {
          username: 'bob',
          code: BattleHistory.compressData('// b'),
          codeCompressed: true,
          finalRating: 1000 - i,
          ratingChange: -i,
          analysis: 'ok',
        },
      ],
      averageRating: 1000,
      battleStarted: new Date(Date.now() - 60000),
      battleEnded: new Date(),
      battleDuration: 60,
    });
  }
  await BattleHistory.insertMany(docs);
});

describe('GET /api/battles/user/:username', () => {
  it('returns the first page with default limit', async () => {
    const res = await request(app)
      .get('/api/battles/user/alice')
      .set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body.battles).toHaveLength(20);
    expect(res.body.pagination.total).toBe(25);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it('returns the second page', async () => {
    const res = await request(app)
      .get('/api/battles/user/alice?page=2&limit=20')
      .set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body.battles).toHaveLength(5);
    expect(res.body.pagination.page).toBe(2);
  });

  it('decompresses the question on the way out', async () => {
    const res = await request(app)
      .get('/api/battles/user/alice?limit=1')
      .set('Authorization', 'Bearer t');
    expect(res.body.battles[0].question).toMatch(/<p>q\d+<\/p>/);
  });

  it('caps limit at 50', async () => {
    const res = await request(app)
      .get('/api/battles/user/alice?limit=999')
      .set('Authorization', 'Bearer t');
    expect(res.body.battles.length).toBeLessThanOrEqual(50);
  });
});
