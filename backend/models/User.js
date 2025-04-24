const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect("mongodb+srv://aaraav2810:aaraav2810@zenith.mzeyjhr.mongodb.net/zenith");

const userSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  username: { type: String },
  fullName: { type: String },
  email: { type: String, required: true, unique: true },
  imageUrl: { type: String },
  createdAt: { type: Date, required: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User; // CommonJS export
