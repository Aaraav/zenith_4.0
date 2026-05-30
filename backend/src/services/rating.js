// @ts-check
const mongoose = require('mongoose');
const User = require('../../models/User');
const BattleHistory = require('../../models/battleHistory');
const { logger } = require('../config/logger');

/**
 * Atomically apply rating increments and persist battle history.
 * Uses a Mongoose transaction when the cluster is a replica set; falls back
 * to sequential ops with manual rollback otherwise (e.g. local single-node).
 *
 * @param {{ roomId: string, room: any, user1: string, user2: string, code1: string, code2: string, user1Analysis: string, user2Analysis: string, user1Increment: number, user2Increment: number, user1Improvements: string, user2Improvements: string, user1Strengths?: string[], user1Weaknesses?: string[], user2Strengths?: string[], user2Weaknesses?: string[], time1?: number, time2?: number }} args
 */
async function applyEvaluationAtomically(args) {
  const {
    roomId, room, user1, user2, code1, code2,
    user1Analysis, user2Analysis, user1Increment, user2Increment,
    user1Improvements, user2Improvements,
    user1Strengths = [], user1Weaknesses = [],
    user2Strengths = [], user2Weaknesses = [],
    time1, time2,
  } = args;

  // @ts-ignore - Internal Mongoose property for topology check
  const supportsTx = mongoose.connection?.client?.topology?.s?.description?.type !== 'Single';

  let session = null;
  if (supportsTx) session = await mongoose.startSession();

  try {
    if (session) session.startTransaction();

    /** @type {any} */
    const r1 = await User.findOne({ username: user1 }, null, session ? { session } : {});
    /** @type {any} */
    const r2 = await User.findOne({ username: user2 }, null, session ? { session } : {});
    if (!r1 || !r2) throw new Error(`User not found in evaluation (room ${roomId})`);

    const r1OldRating = r1.finalRating || 1000;
    const r2OldRating = r2.finalRating || 1000;
    const r1NewRating = r1OldRating + user1Increment;
    const r2NewRating = r2OldRating + user2Increment;

    await User.findByIdAndUpdate(r1._id, { finalRating: r1NewRating }, session ? { session } : {});
    await User.findByIdAndUpdate(r2._id, { finalRating: r2NewRating }, session ? { session } : {});

    const questionToSave = typeof room.question === 'string' ? room.question : (room.question?.htmlContent || '');

    const battleData = {
      roomId,
      // @ts-ignore
      question: BattleHistory.compressData(questionToSave),
      questionCompressed: true,
      users: [
        // @ts-ignore
        { username: user1, code: BattleHistory.compressData(code1 || ''), codeCompressed: true, finalRating: r1NewRating, ratingChange: user1Increment, analysis: user1Analysis, improvements: user1Improvements || '', submissionTime: time1 || 0 },
        // @ts-ignore
        { username: user2, code: BattleHistory.compressData(code2 || ''), codeCompressed: true, finalRating: r2NewRating, ratingChange: user2Increment, analysis: user2Analysis, improvements: user2Improvements || '', submissionTime: time2 || 0 },
      ],
      topic: room.topic || 'DSA',
      averageRating: Math.round((r1OldRating + r2OldRating) / 2),
      battleStarted: room.createdAt || new Date(Date.now() - 600000),
      battleEnded: new Date(),
      battleDuration: room.createdAt ? Math.round((Date.now() - new Date(room.createdAt).getTime()) / 1000) : 600,
    };

    await BattleHistory.create(session ? [battleData] : [battleData], session ? { session } : undefined);

    if (session) await session.commitTransaction();

    return {
      user1: {
        username: user1,
        newRating: r1NewRating,
        increment: user1Increment,
        imageUrl: r1.imageUrl || '',
        analysis: user1Analysis,
        improvements: user1Improvements,
        strengths: user1Strengths,
        weaknesses: user1Weaknesses,
      },
      user2: {
        username: user2,
        newRating: r2NewRating,
        increment: user2Increment,
        imageUrl: r2.imageUrl || '',
        analysis: user2Analysis,
        improvements: user2Improvements,
        strengths: user2Strengths,
        weaknesses: user2Weaknesses,
      },
    };
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); } catch (e) { logger.error({ e }, 'tx abort failed'); }
    }
    throw err;
  } finally {
    if (session) session.endSession();
  }
}

module.exports = { applyEvaluationAtomically };
