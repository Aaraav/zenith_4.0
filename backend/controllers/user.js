const User = require('../models/User');  

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

const updateUsername = async (req, res) => {
  const { clerkId, username } = req.body;

  try {
    const user = await User.findOne({ clerkId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.username = username; 
    await user.save();

    return res.status(200).json({ success: true, message: 'Username updated successfully', user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { saveUser, updateUsername, getUser };
