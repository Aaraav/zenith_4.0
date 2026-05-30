// @ts-check
const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const { env } = require('../config/env');
const { requireAuth } = require('../middleware/requireAuth');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

// GET /api/agora/token?channel=<roomId>&uid=<numeric uid (optional)>
router.get(
  '/token',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { channel, uid = '0' } = req.query;
    if (!channel || typeof channel !== 'string') {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'channel is required' } });
    }
    if (!env.AGORA_APP_ID || !env.AGORA_APP_CERTIFICATE) {
      return res.status(503).json({ error: { code: 'NOT_CONFIGURED', message: 'Agora credentials not set' } });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const token = RtcTokenBuilder.buildTokenWithUid(
      env.AGORA_APP_ID,
      env.AGORA_APP_CERTIFICATE,
      channel,
      Number(uid),
      RtcRole.PUBLISHER,
      expiresAt,
    );

    return res.json({ token, uid: Number(uid), channel });
  }),
);

module.exports = router;
