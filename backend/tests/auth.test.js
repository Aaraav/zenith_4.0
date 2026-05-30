import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

let app;

beforeAll(async () => {
  const mod = await import('../src/app.js');
  app = mod.createApp().app;
});

describe('REST auth gating', () => {
  it('rejects requests without an Authorization header', async () => {
    const res = await request(app).get('/api/users/getUser/some-clerk-id');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('UNAUTHORIZED');
  });

  it('rejects an invalid token', async () => {
    const res = await request(app)
      .get('/api/users/getUser/some-clerk-id')
      .set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(401);
  });

  it('accepts a valid bearer token (mocked verifier)', async () => {
    // Our mock treats the token string as the clerkId. The user does not exist
    // in DB so the underlying controller returns 404 — but auth has passed.
    const res = await request(app)
      .get('/api/users/getUser/some-clerk-id')
      .set('Authorization', 'Bearer test-token');
    expect([200, 404]).toContain(res.status);
  });
});

describe('CORS', () => {
  it('blocks disallowed origins', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'https://evil.example.com');
    // CORS error is propagated through the error handler -> 500 with CORS message,
    // since express-cors throws. We assert it's at least not 200.
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('permits the configured origin', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:3000');
    expect(res.status).toBe(200);
  });
});
