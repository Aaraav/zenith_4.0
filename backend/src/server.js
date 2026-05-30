// @ts-check
const http = require('http');
const { Server } = require('socket.io');

const { env } = require('./config/env');
const { logger } = require('./config/logger');
const { connectDB } = require('./config/db');
const { createApp } = require('./app');
const { registerSockets } = require('./sockets');

async function start() {
  await connectDB();

  const { app, corsOptions } = createApp();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: corsOptions });

  registerSockets(io);

  httpServer.listen(env.PORT, () => {
    logger.info({ event: 'server-listen', port: env.PORT }, `🚀 Server running on http://localhost:${env.PORT}`);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
