// @ts-check
const mongoose = require('mongoose');
const { env } = require('./env');
const { logger } = require('./logger');

async function connectDB() {
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env and fill it in.');
  }
  await mongoose.connect(env.MONGODB_URI);
  logger.info({ event: 'mongo-connected' }, '✅ MongoDB connected');
}

module.exports = { connectDB };
