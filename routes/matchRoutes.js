const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware');
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

// Apply authentication to ALL match routes
router.use(requireAuth);

router.get('/', getAllMatches);
router.get('/:id', getMatchById);
router.post('/', createMatch);
router.post('/:id/select-player', selectPlayer);
router.post('/:id/score-runs', scoreRuns);
router.post('/:id/score-extra', scoreExtra);
router.post('/:id/player-out', playerOut);
router.post('/:id/end-innings', endInnings);

module.exports = router;