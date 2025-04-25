const express = require('express');
const { saveUser, updateUsername, getUser } = require('../controllers/user');
// const { submitRating } = require('../controllers/room'); // Import the new controller

const router = express.Router();

// Existing user routes
router.post('/save-user', saveUser);
router.put('/update-username', updateUsername);
router.get('/getUser/:clerkId', getUser);

// 🆕 New route to submit rating
// router.post('/submit', submitRating);  // Add this line

module.exports = router;
