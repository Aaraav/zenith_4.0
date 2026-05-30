// @ts-check
const express = require('express');
const { asyncHandler } = require('../middleware/asyncHandler');
const { getLeetCodeStats, getCodeChefStats } = require('../services/platformStats');

const router = express.Router();

const FETCHERS = {
  leetcode:  getLeetCodeStats,
  codechef:  getCodeChefStats,
};

// GET /api/platform-stats/:platform/:username
router.get(
  '/:platform/:username',
  asyncHandler(async (req, res) => {
    const { platform, username } = req.params;
    const fetcher = FETCHERS[platform.toLowerCase()];

    if (!fetcher) {
      return res.status(400).json({ error: { code: 'UNSUPPORTED_PLATFORM', message: `Platform '${platform}' is not supported` } });
    }

    const stats = await fetcher(username);
    return res.json({ platform, username, stats });
  }),
);

module.exports = router;
