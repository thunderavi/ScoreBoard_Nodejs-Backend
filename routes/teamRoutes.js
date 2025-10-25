const express = require('express');
const router = express.Router();
const {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  exportTeams,
  clearAllTeams
} = require('../controllers/teamController');
const { requireAuth, optionalAuth } = require('../middleware');

// Public routes (can view teams without login)
router.get('/', optionalAuth, getAllTeams);
router.get('/export/all', optionalAuth, exportTeams);
router.get('/:id', optionalAuth, getTeamById);

// Protected routes (require authentication)
router.post('/', requireAuth, createTeam);
router.put('/:id', requireAuth, updateTeam);
router.delete('/:id', requireAuth, deleteTeam);
router.delete('/clear/all', requireAuth, clearAllTeams);

module.exports = router;