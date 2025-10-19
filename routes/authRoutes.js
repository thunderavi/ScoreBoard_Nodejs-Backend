const express = require('express');
const router = express.Router();
const { 
  signup, 
  login, 
  logout, 
  getCurrentUser, 
  checkAuth 
} = require('../controllers/authController');
const { requireAuth } = require('../middleware');

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/check', checkAuth);

// Protected routes (require authentication)
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getCurrentUser);

module.exports = router;