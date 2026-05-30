// @ts-check
const { socketAuth } = require('../middleware/socketAuth');
const { logger } = require('../config/logger');
const { registerMatchmaking } = require('./matchmaking');
const { registerRoomEvents } = require('./rooms');

function registerSockets(io) {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    logger.info({ event: 'socket-connect', socketId: socket.id, clerkId: socket.data.clerkId, username: socket.data.username }, 'User connected');
    registerMatchmaking(io, socket);
    registerRoomEvents(io, socket);

    socket.on('disconnect', async () => {
      logger.info({ event: 'socket-disconnect', socketId: socket.id }, 'User disconnected');
    });
  });
}

module.exports = { registerSockets };
