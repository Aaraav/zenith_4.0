// @ts-check
const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { writeLimiter, readLimiter } = require('../middleware/rateLimit');
const { saveUser, updateUsername, getUser, getUserByUsername, updatePlatforms } = require('../../controllers/user');

const router = express.Router();

router.get('/by-username/:username', readLimiter, getUserByUsername);
router.post('/save-user', writeLimiter, requireAuth, saveUser);
router.put('/update-username', writeLimiter, requireAuth, updateUsername);
router.put('/update-platforms', writeLimiter, requireAuth, updatePlatforms);
router.get('/getUser/:clerkId', readLimiter, requireAuth, getUser);

module.exports = router;
