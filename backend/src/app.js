// @ts-check
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');

const { env } = require('./config/env');
const { logger } = require('./config/logger');
const { globalLimiter } = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');
const usersRouter = require('./routes/users');
const battlesRouter = require('./routes/battles');
const agoraRouter = require('./routes/agora');
const platformStatsRouter = require('./routes/platformStats');
const roomsRouter = require('./routes/rooms');
const compilerRouter = require('./routes/compiler');

function createApp() {
  const app = express();

  const corsOptions = {
    origin: (origin, cb) => {
      if (!origin || env.FRONTEND_ORIGIN.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
  };

  // @ts-ignore
  app.use(helmet());
  // @ts-ignore
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '256kb' }));
  // @ts-ignore
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/' } }));
  app.use(globalLimiter);

  app.get('/', (req, res) => res.send('Zenith Coding Platform API is running...'));

  app.use('/api/users', usersRouter);
  app.use('/api/battles', battlesRouter);
  app.use('/api/agora', agoraRouter);
  app.use('/api/platform-stats', platformStatsRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/compiler', compilerRouter);

  app.use(errorHandler);

  return { app, corsOptions };
}

module.exports = { createApp };
