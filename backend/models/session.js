// models/Session.js
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  user1: String,
  user2: String,
  question: String,
});

module.exports = mongoose.model("Session", sessionSchema);
