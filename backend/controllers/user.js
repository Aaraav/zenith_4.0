const User = require('../models/User');  // Use require instead of import

// Save user data in the database
const saveUser = async (req, res) => {
  const { clerkId, username, fullName, email, imageUrl, createdAt } = req.body;

  try {
    let user = await User.findOne({ clerkId });

    if (!user) {
      user = new User({ clerkId, username, fullName, email, imageUrl, createdAt });
      await user.save();
      return res.status(201).json({ success: true, message: 'User saved', user });
    } else {
      return res.status(200).json({ success: true, message: 'User already exists' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get user data by clerkId
const getUser = async (req, res) => {
  const { clerkId } = req.params;  // Get the clerkId from the request parameters

  try {
    const user = await User.findOne({ clerkId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update username of an existing user
const updateUsername = async (req, res) => {
  const { clerkId, username } = req.body;

  try {
    const user = await User.findOne({ clerkId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.username = username; // Update the username
    await user.save();

    return res.status(200).json({ success: true, message: 'Username updated successfully', user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Export the functions using CommonJS
module.exports = { saveUser, updateUsername, getUser };
