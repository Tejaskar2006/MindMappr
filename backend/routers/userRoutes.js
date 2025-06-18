const { registerUser, loginUser, getUserProfile } = require('../controllers/userControllers')
const express = require('express');
const router = express.Router();
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', getUserProfile);
module.exports = router;