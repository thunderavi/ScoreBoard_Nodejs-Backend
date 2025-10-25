const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware');
const {
  getPlayersByTeam,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
  exportPlayers,
  clearTeamPlayers
} = require('../controllers/playerController');

// Apply authentication to ALL player routes
router.use(requireAuth);

router.get('/team/:teamId', getPlayersByTeam);
router.get('/export/:teamId', exportPlayers);
router.get('/:id', getPlayerById);
router.post('/', createPlayer);
router.put('/:id', updatePlayer);
router.delete('/clear/:teamId', clearTeamPlayers);
router.delete('/:id', deletePlayer);

module.exports = router;