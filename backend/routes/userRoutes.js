const express = require('express');
const { saveUser,updateUsername,getUser } = require('../controllers/user'); // Correctly import saveUser
const router = express.Router();

router.post('/save-user', saveUser);
router.put('/update-username',updateUsername);
router.get('/getUser/:clirkId',getUser);
  // Correctly pass saveUser as a function handler

module.exports = router;
