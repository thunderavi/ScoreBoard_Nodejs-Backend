const express = require('express');
const router = express.Router();
const {
  getPlayersByTeam,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
  exportPlayers,
  clearTeamPlayers
} = require('../controllers/playerController');
const { requireAuth, optionalAuth } = require('../middleware');

// Public routes
router.get('/team/:teamId', optionalAuth, getPlayersByTeam);
router.get('/export/:teamId', optionalAuth, exportPlayers);
router.get('/:id', optionalAuth, getPlayerById);

// Protected routes (require authentication)
router.post('/', requireAuth, createPlayer);
router.put('/:id', requireAuth, updatePlayer);
router.delete('/:id', requireAuth, deletePlayer);
router.delete('/clear/:teamId', requireAuth, clearTeamPlayers);

module.exports = router;