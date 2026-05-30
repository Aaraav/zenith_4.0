// @ts-check
/**
 * Wraps an async route handler so thrown errors propagate to the central error handler.
 * @param {Function} fn
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
