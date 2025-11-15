const mongoose = require('mongoose');

const commentarySchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true,
    index: true
  },
  
  // Event type that triggered commentary
  eventType: {
    type: String,
    enum: [
      'RUNS_SCORED',   // 1, 2, 3 runs
      'FOUR',          // Boundary
      'SIX',           // Over boundary
      'WICKET',        // Player out
      'WIDE',          // Wide ball
      'NO_BALL',       // No ball
      'DOT_BALL',      // No run
      'INNINGS_END',   // Innings completed
      'MATCH_START',   // Match started
      'MATCH_END'      // Match completed
    ],
    required: true
  },
  
  // Generated commentary text
  commentaryText: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Audio file URL (stored in public/audio folder)
  audioUrl: {
    type: String,
    default: null
  },
  
  // Audio duration in seconds
  audioDuration: {
    type: Number,
    default: null
  },
  
  // Event data for context
  eventData: {
    innings: Number,
    overNumber: String,      // "3.4" 
    ballInOver: Number,      // 0-5
    runs: Number,
    
    // Player info
    batterName: String,
    bowlerName: String,
    
    // Score at time of event
    teamRuns: Number,
    teamWickets: Number,
    teamScore: String,       // "125/4"
    
    // Additional context
    dismissalType: String,   // caught, bowled, lbw, run out
    fielderName: String,
    
    // Team names
    battingTeam: String,
    bowlingTeam: String,
    
    // Match context
    target: Number,          // For second innings
    runsNeeded: Number,      // Runs needed to win
    ballsRemaining: Number
  },
  
  // Commentary priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes
commentarySchema.index({ matchId: 1, createdAt: -1 });
commentarySchema.index({ matchId: 1, eventType: 1 });

// Static method to get recent commentary
commentarySchema.statics.getRecentCommentary = function(matchId, limit = 20) {
  return this.find({ matchId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.models.Commentary || mongoose.model('Commentary', commentarySchema);