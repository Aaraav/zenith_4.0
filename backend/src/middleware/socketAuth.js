// @ts-check
const { verifyToken } = require('@clerk/backend');
const { env } = require('../config/env');
const { logger } = require('../config/logger');
const User = require('../../models/User');

/**
 * Socket.IO middleware that verifies a Clerk JWT from `socket.handshake.auth.token`,
 * resolves the associated User, and attaches identity to `socket.data`.
 * Connections without a valid token are rejected.
 */
async function socketAuth(socket, next) {
  try {
    const token = socket.handshake?.auth?.token;
    if (!token) return next(new Error('UNAUTHORIZED: missing token'));
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
    if (!payload?.sub) return next(new Error('UNAUTHORIZED: invalid token'));

    const user = await User.findOne({ clerkId: payload.sub }).lean();
    if (!user) return next(new Error('UNAUTHORIZED: user not registered'));

    socket.data.clerkId = payload.sub;
    socket.data.username = user.username;
    socket.data.userId = String(user._id);
    return next();
  } catch (err) {
    logger.warn({ err: err.message }, 'socket auth failed');
    return next(new Error('UNAUTHORIZED'));
  }
}

module.exports = { socketAuth };
