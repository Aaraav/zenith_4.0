const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  value: {
    type: Number,
    required: true,
    min: 1000,
    max: 3000 // AI-generated ratings might be softer (like 3.2, etc.)
  },

  comment: { type: String }, // optional

  // Who is giving the rating
  givenByType: {
    type: String,
    enum: ['User', 'AI'],
    required: true
  },
  givenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Only used if givenByType is 'User'
    required: function () {
      return this.givenByType === 'User';
    }
  },

  // Who or what the rating is for
  targetType: {
    type: String,
    enum: ['User', 'AI'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function () {
      return this.targetType === 'User';
    }
  },

  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Rating', ratingSchema);
