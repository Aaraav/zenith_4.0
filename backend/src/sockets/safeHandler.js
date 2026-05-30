// @ts-check
const { logger } = require('../config/logger');

/**
 * Wrap a Socket.IO event handler with try/catch + logging + client error emission.
 * @param {string} event
 * @param {Function} fn
 */
function safeHandler(event, fn) {
  return async function wrapped(...args) {
    try {
      await fn.apply(this, args);
    } catch (err) {
      logger.error({ event, err, socketId: this.id, clerkId: this.data?.clerkId }, 'Socket handler failed');
      this.emit('serverError', { event, message: 'An internal error occurred' });
    }
  };
}

module.exports = { safeHandler };
