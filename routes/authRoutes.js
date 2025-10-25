const express = require('express');
const router = express.Router();
const { signup, login, logout, getCurrentUser, checkAuth } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', getCurrentUser);
router.get('/check', checkAuth);

module.exports = router;