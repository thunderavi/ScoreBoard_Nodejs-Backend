const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware');
const {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  exportTeams,
  clearAllTeams
} = require('../controllers/teamController');

// Apply authentication to ALL team routes
router.use(requireAuth);

router.get('/', getAllTeams);
router.get('/export/all', exportTeams);
router.get('/:id', getTeamById);
router.post('/', createTeam);
router.put('/:id', updateTeam);
router.delete('/clear/all', clearAllTeams);
router.delete('/:id', deleteTeam);

module.exports = router;