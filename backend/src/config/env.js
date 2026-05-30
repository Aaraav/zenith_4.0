// @ts-check
require('dotenv').config();

const required = ['MONGODB_URI', 'GROQ_API_KEY', 'CLERK_SECRET_KEY'];

function loadEnv() {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`⚠️  Missing env vars (dev mode, continuing): ${missing.join(', ')}`);
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: Number(process.env.PORT) || 4000,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    MONGODB_URI: process.env.MONGODB_URI || '',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',
    FRONTEND_ORIGIN: (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    AGORA_APP_ID: process.env.AGORA_APP_ID || '',
    AGORA_APP_CERTIFICATE: process.env.AGORA_APP_CERTIFICATE || '',
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  };
}

module.exports = { env: loadEnv() };
