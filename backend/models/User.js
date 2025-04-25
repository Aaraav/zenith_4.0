const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  username: {
    type: String,
    unique: true,
    validate: {
      validator: function (v) {
        return !v.includes('_');
      },
      message: props => `${props.value} is not a valid username. Underscores (_) are not allowed.`
    }
  },
  fullName: { type: String },
  email: { type: String, required: true, unique: true },
  imageUrl: { type: String },
  createdAt: { type: Date, required: true },
  ratings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Rating' }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
