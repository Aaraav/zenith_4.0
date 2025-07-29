const mongoose = require("mongoose");
const zlib = require("zlib");

const BattleHistorySchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true, // For faster queries
  },

  // Compressed question data
  question: {
    type: String, // Base64 encoded gzipped HTML
    required: true,
  },
  questionCompressed: {
    type: Boolean,
    default: true,
  },

  // User battle data
  users: [
    {
      username: {
        type: String,
        required: true,
        index: true, // For user history queries
      },
      code: {
        type: String, // Base64 encoded gzipped code
        required: true,
      },
      codeCompressed: {
        type: Boolean,
        default: true,
      },
      finalRating: {
        type: Number,
        required: true,
      },
      ratingChange: {
        type: Number,
        required: true,
      },
      analysis: {
        type: String, // AI evaluation feedback
        required: true,
      },
    },
  ],

  // Battle metadata
  battleDuration: {
    type: Number, // Duration in seconds
    default: 0,
  },
  topic: {
    type: String,
    default: "DSA",
  },
  averageRating: {
    type: Number,
    required: true,
  },

  // Timestamps
  battleStarted: {
    type: Date,
    required: true,
  },
  battleEnded: {
    type: Date,
    default: Date.now,
  },

  // For analytics
  createdAt: {
    type: Date,
    default: Date.now,
    index: true, // For time-based queries
  },
});

// Compression utilities
BattleHistorySchema.statics.compressData = function (data) {
  return zlib.gzipSync(data).toString("base64");
};

BattleHistorySchema.statics.decompressData = function (compressedData) {
  return zlib.gunzipSync(Buffer.from(compressedData, "base64")).toString();
};

// Instance method to get decompressed data
BattleHistorySchema.methods.getDecompressedData = function () {
  return {
    ...this.toObject(),
    question: this.questionCompressed
      ? BattleHistory.decompressData(this.question)
      : this.question,
    users: this.users.map((user) => ({
      ...user.toObject(),
      code: user.codeCompressed
        ? BattleHistory.decompressData(user.code)
        : user.code,
    })),
  };
};

// Indexes for performance
BattleHistorySchema.index({ "users.username": 1, createdAt: -1 }); // User history
BattleHistorySchema.index({ createdAt: -1 }); // Recent battles
BattleHistorySchema.index({ averageRating: 1 }); // Rating-based queries

const BattleHistory = mongoose.model("BattleHistory", BattleHistorySchema);

module.exports = BattleHistory;