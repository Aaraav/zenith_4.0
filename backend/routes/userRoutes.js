const express = require('express');
const { saveUser, updateUsername, getUser } = require('../controllers/user');

const router = express.Router();

// Existing user routes
router.post('/save-user', saveUser);
router.put('/update-username', updateUsername);
router.get('/getUser/:clerkId', getUser);



module.exports = router;
