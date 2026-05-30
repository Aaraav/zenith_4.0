// @ts-check
const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { getMatchmakingStore } = require('../services/matchmakingStore');

const router = express.Router();

router.get(
  '/:roomId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const store = getMatchmakingStore();
    const room = await store.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.json({
      success: true,
      room: {
        roomId,
        questionData: room.question,
        question: room.question?.htmlContent || room.question,
        topic: room.topic,
        createdAt: room.createdAt,
        users: Object.keys(room.users).map(u => ({
          username: u,
          hasSubmitted: room.users[u].hasSubmitted
        }))
      }
    });
  }),
);

module.exports = router;
