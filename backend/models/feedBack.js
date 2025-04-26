const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  tags: [{
    type: String,
    enum: [
      'Clarity Champion',
      'Speed Specialist',
      'Simplicity Expert',
      'Robust Performer',
      'Clever Trickster',
      'Precision Focused',
      'Versatility Friendly'
    ]
  }],
  comment: { type: String }, // Optional feedback

  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
