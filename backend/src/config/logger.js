// @ts-check
const pino = require('pino');
const { env } = require('./env');

const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
});

module.exports = { logger };
