// @ts-check
const { logger } = require('../config/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 401 ? 'UNAUTHORIZED' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR');

  logger.error(
    { err, path: req.path, method: req.method, clerkId: req.auth?.clerkId },
    err.message,
  );

  res.status(status).json({
    error: {
      code,
      message: status === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    },
  });
}

module.exports = { errorHandler };
