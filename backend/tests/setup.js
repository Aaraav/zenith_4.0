import { afterAll, beforeAll } from 'vitest';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Required env vars for the app to boot in tests (set before dotenv loads from .env).
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://placeholder/test'; // overridden below
process.env.GEMINI_API_KEY = 'test-key';
process.env.GROQ_API_KEY = 'test-key';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.LOG_LEVEL = 'silent';
process.env.UPSTASH_REDIS_REST_URL = '';
process.env.UPSTASH_REDIS_REST_TOKEN = '';

// Force Clerk mock for CJS require() used by requireAuth middleware.
const clerkMockPath = path.join(__dirname, 'mocks/clerkBackend.cjs');
const clerkResolved = require.resolve('@clerk/backend');
require.cache[clerkResolved] = {
  id: clerkResolved,
  filename: clerkMockPath,
  loaded: true,
  exports: require(clerkMockPath),
};

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
