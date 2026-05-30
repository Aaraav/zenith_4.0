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

// Get public user profile by username (no email or clerkId)
const getUserByUsername = async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username })
      .select('-email -clerkId')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user });
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

// Update platform usernames (codeforces, codechef, leetcode, codingninjas)
const updatePlatforms = async (req, res) => {
  const { clerkId, platformUsernames } = req.body;
  if (!clerkId || typeof platformUsernames !== 'object') {
    return res.status(400).json({ success: false, message: 'clerkId and platformUsernames are required' });
  }
  try {
    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.platformUsernames = {
      codeforces:   platformUsernames.codeforces   || '',
      codechef:     platformUsernames.codechef     || '',
      leetcode:     platformUsernames.leetcode     || '',
      codingninjas: platformUsernames.codingninjas || '',
    };
    await user.save();
    return res.status(200).json({ success: true, message: 'Platform usernames updated', user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Export the functions using CommonJS
module.exports = { saveUser, updateUsername, getUser, getUserByUsername, updatePlatforms };
