// @ts-check
const { verifyToken } = require('@clerk/backend');
const { env } = require('../config/env');

/**
 * Express middleware that verifies a Clerk session JWT from the Authorization header.
 * On success, attaches `req.auth = { clerkId }`.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      const err = new Error('Missing Authorization header');
      // @ts-ignore
      err.status = 401;
      // @ts-ignore
      err.code = 'UNAUTHORIZED';
      throw err;
    }
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties: env.FRONTEND_ORIGIN,
    });
    // @ts-ignore
    if (!payload?.sub) {
      const err = new Error('Invalid token');
      // @ts-ignore
      err.status = 401;
      // @ts-ignore
      err.code = 'UNAUTHORIZED';
      throw err;
    }
    req.auth = { clerkId: payload.sub };
    next();
  } catch (err) {
    if (!err.status) {
      // @ts-ignore
      err.status = 401;
      // @ts-ignore
      err.code = 'UNAUTHORIZED';
    }
    next(err);
  }
}

module.exports = { requireAuth };
