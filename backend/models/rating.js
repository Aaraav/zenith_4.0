const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  value: {
    type: Number,
    required: true,
    min: 1000,
    max: 3000 
  },

  comment: { type: String }, 

  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function () {
      return this.targetType === 'User';
    }
  },

  
}, { timestamps: true });

module.exports = mongoose.model('Rating', ratingSchema);
