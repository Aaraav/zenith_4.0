const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who gave feedback
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedbackText: { type: String },
  question: { type: String, required: true },
  
  feedbackFor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // for whom
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
