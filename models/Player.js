const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  playerName: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true,
    maxlength: [50, 'Player name cannot exceed 50 characters']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    enum: ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper', 'Captain', 'Vice-Captain']
  },
  contact: {
    type: String,
    trim: true,
    maxlength: [15, 'Contact cannot exceed 15 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  photo: {
    type: String,
    required: [true, 'Player photo is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
playerSchema.index({ teamId: 1, playerName: 1 });

module.exports = mongoose.models.Player || mongoose.model('Player', playerSchema);