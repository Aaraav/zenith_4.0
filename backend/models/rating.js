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
  

  // Who or what the rating is for
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function () {
      return this.targetType === 'User';
    }
  },

  
}, { timestamps: true });

module.exports = mongoose.model('Rating', ratingSchema);
