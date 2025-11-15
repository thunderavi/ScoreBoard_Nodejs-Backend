const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware');
const {
  generateCommentary,
  synthesizeSpeech,
  getMatchCommentary,
  generateCommentaryWithAudio,
  streamMatchEvents  // ⭐ FIXED: Added this import
} = require('../controllers/commentaryController');

// Apply authentication to ALL commentary routes
router.use(requireAuth);

// Generate commentary text only
router.post('/generate', generateCommentary);

// Convert text to speech
router.post('/synthesize', synthesizeSpeech);

// Generate commentary with audio (combined - RECOMMENDED)
router.post('/generate-with-audio', generateCommentaryWithAudio);

// Get commentary history for a match
router.get('/match/:matchId', getMatchCommentary);

// ⭐ NEW: Real-time event stream (SSE)
router.get('/stream/:matchId', streamMatchEvents);

module.exports = router;