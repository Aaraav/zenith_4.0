// @ts-check
const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { readLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/asyncHandler');
const BattleHistory = require('../../models/battleHistory');

const router = express.Router();

const MAX_LIMIT = 50;
const STATS_WINDOW_DAYS = 90;

router.get(
  '/user/:username',
  readLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, MAX_LIMIT);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = { 'users.username': username };
    const [battles, total] = await Promise.all([
      BattleHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      BattleHistory.countDocuments(filter),
    ]);

    res.json({
      success: true,
      battles: battles.map((b) => /** @type {any} */(b).getDecompressedData()),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.get(
  '/recent',
  readLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, MAX_LIMIT);
    const battles = await BattleHistory.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('roomId users.username users.finalRating users.ratingChange createdAt battleDuration');
    res.json({ success: true, battles });
  }),
);

router.get(
  '/stats/:username',
  readLimiter,
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const since = new Date(Date.now() - STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const stats = await BattleHistory.aggregate([
      { $match: { 'users.username': username, createdAt: { $gte: since } } },
      { $unwind: '$users' },
      { $match: { 'users.username': username } },
      {
        $group: {
          _id: null,
          totalBattles: { $sum: 1 },
          totalRatingGained: { $sum: '$users.ratingChange' },
          averageRatingChange: { $avg: '$users.ratingChange' },
          wins: { $sum: { $cond: [{ $gt: ['$users.ratingChange', 15] }, 1, 0] } },
          maxRatingGain: { $max: '$users.ratingChange' },
          currentRating: { $last: '$users.finalRating' },
        },
      },
    ]);

    const userStats = stats[0] || {
      totalBattles: 0,
      totalRatingGained: 0,
      averageRatingChange: 0,
      wins: 0,
      maxRatingGain: 0,
      currentRating: 1000,
    };

    res.json({
      success: true,
      stats: {
        ...userStats,
        winRate: userStats.totalBattles > 0
          ? ((userStats.wins / userStats.totalBattles) * 100).toFixed(1)
          : 0,
      },
    });
  }),
);

module.exports = router;
