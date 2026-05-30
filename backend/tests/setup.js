import { afterAll, beforeAll, vi } from 'vitest';

// Required env vars for the app to boot in tests.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://placeholder/test'; // overridden below
process.env.GEMINI_API_KEY = 'test-key';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.LOG_LEVEL = 'silent';

// Mock @clerk/backend so tests don't need real Clerk infra.
// We treat the bearer token itself as the clerkId for simplicity.
vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn(async (token) => {
    if (!token || token === 'invalid') throw new Error('invalid');
    return { sub: token };
  }),
}));

// Boot mongodb-memory-server for the duration of the test run.
let mongod;
let mongoose;

beforeAll(async () => {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  mongoose = (await import('mongoose')).default;
  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  if (mongoose) await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
