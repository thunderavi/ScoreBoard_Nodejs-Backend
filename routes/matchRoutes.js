const express = require('express');
const router = express.Router();
const {
  getAllMatches,
  getMatchById,
  createMatch,
  selectPlayer,
  scoreRuns,
  scoreExtra,
  playerOut,
  endInnings
} = require('../controllers/matchController');
const { requireAuth, optionalAuth } = require('../middleware');

// Public routes
router.get('/', optionalAuth, getAllMatches);
router.get('/:id', optionalAuth, getMatchById);

// Protected routes (require authentication)
router.post('/', requireAuth, createMatch);
router.post('/:id/select-player', requireAuth, selectPlayer);
router.post('/:id/score-runs', requireAuth, scoreRuns);
router.post('/:id/score-extra', requireAuth, scoreExtra);
router.post('/:id/player-out', requireAuth, playerOut);
router.post('/:id/end-innings', requireAuth, endInnings);

module.exports = router;