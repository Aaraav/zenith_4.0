const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  username: {
    type: String,
    unique: true,
  
  },
  fullName: { type: String },
  email: { type: String, required: true, unique: true },
  imageUrl: { type: String },
  createdAt: { type: Date, required: true },
  finalRating: { type: Number, default: 1000 },  // Added finalRating field to store rating
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
