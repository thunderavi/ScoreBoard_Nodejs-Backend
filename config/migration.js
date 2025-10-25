const mongoose = require('mongoose');

const matchScoreSchema = new mongoose.Schema({
  innings: {
    type: Number,
    required: true,
    enum: [1, 2]
  },
  battingTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  runs: {
    type: Number,
    default: 0
  },
  wickets: {
    type: Number,
    default: 0
  },
  balls: {
    type: Number,
    default: 0
  },
  fours: {
    type: Number,
    default: 0
  },
  sixes: {
    type: Number,
    default: 0
  },
  completedPlayers: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  currentPlayer: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  team1Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  team2Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  tossWinnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  coinResult: {
    type: String,
    required: true,
    enum: ['heads', 'tails']
  },
  tossChoice: {
    type: String,
    required: true,
    enum: ['batting', 'fielding']
  },
  battingFirstId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  fieldingFirstId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  // ⭐ CRITICAL: Add createdBy field for user isolation
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  status: {
    type: String,
    enum: ['setup', 'live', 'completed'],
    default: 'setup'
  },
  resultText: {
    type: String,
    default: null
  },
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  innings1Data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  innings2Data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  scores: [matchScoreSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// Index for faster queries - UPDATED with createdBy
matchSchema.index({ status: 1, createdAt: -1 });
matchSchema.index({ team1Id: 1, team2Id: 1 });
matchSchema.index({ createdBy: 1, status: 1 }); // ⭐ NEW: For user-specific queries

module.exports = mongoose.models.Match || mongoose.model('Match', matchSchema);