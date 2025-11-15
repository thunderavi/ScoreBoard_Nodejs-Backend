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
  
  // ⭐ NEW FIELDS for complete scoreboard
  overs: {
    type: String,
    default: "0.0"  // Format: "15.4"
  },
  runRate: {
    type: Number,
    default: 0
  },
  
  // ⭐ NEW: Current over balls (last 6 deliveries)
  currentOver: {
    type: [mongoose.Schema.Types.Mixed], 
    default: []  // e.g., [1, 4, 0, "W", 6, 2]
  },
  
  // ⭐ NEW: Extras
  extras: {
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legByes: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  // ⭐ NEW: For second innings
  target: {
    type: Number,
    default: null
  },
  runsNeeded: {
    type: Number,
    default: null
  },
  ballsRemaining: {
    type: Number,
    default: null
  },
  
  // ⭐ NEW: Current bowler name (simple string for now)
  currentBowler: {
    type: String,
    default: null
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['setup', 'live', 'completed'],
    default: 'setup'
  },
  
  // ⭐ NEW: Current innings number
  currentInnings: {
    type: Number,
    default: 1,
    enum: [1, 2]
  },
  
  // ⭐ NEW: Total overs for match
  totalOvers: {
    type: Number,
    default: 20  // T20 format
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

// Indexes
matchSchema.index({ status: 1, createdBy: 1, createdAt: -1 });
matchSchema.index({ team1Id: 1, team2Id: 1, createdBy: 1 });
matchSchema.index({ createdBy: 1, status: 1 });

// Pre-save hook
matchSchema.pre('save', function(next) {
  if (!this.createdBy) {
    return next(new Error('createdBy is required'));
  }
  next();
});

// ⭐ NEW: Helper method to calculate overs from balls
matchSchema.methods.calculateOvers = function(balls) {
  const completedOvers = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${completedOvers}.${remainingBalls}`;
};

// ⭐ NEW: Helper method to calculate run rate
matchSchema.methods.calculateRunRate = function(runs, balls) {
  if (balls === 0) return 0;
  return parseFloat(((runs / balls) * 6).toFixed(2));
};

module.exports = mongoose.models.Match || mongoose.model('Match', matchSchema);