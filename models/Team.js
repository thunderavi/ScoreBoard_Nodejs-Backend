const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [50, 'Team name cannot exceed 50 characters']
  },
  captain: {
    type: String,
    required: [true, 'Captain name is required'],
    trim: true,
    maxlength: [50, 'Captain name cannot exceed 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  logo: {
    type: String,
    required: [true, 'Team logo is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for player count (will be populated when needed)
teamSchema.virtual('playerCount', {
  ref: 'Player',
  localField: '_id',
  foreignField: 'teamId',
  count: true
});

module.exports = mongoose.models.Team || mongoose.model('Team', teamSchema);