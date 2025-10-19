const { Player, Team } = require('../models');

// @desc    Get all players for a team
// @route   GET /api/players/team/:teamId
const getPlayersByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const players = await Player.find({ teamId }).sort({ createdAt: -1 });

    const playersWithDate = players.map(player => ({
      id: player._id,
      teamId: player.teamId,
      playerName: player.playerName,
      position: player.position,
      contact: player.contact,
      email: player.email,
      description: player.description,
      photo: player.photo,
      createdAt: player.createdAt,
      createdDate: player.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }));

    res.json({
      success: true,
      count: playersWithDate.length,
      teamName: team.name,
      players: playersWithDate
    });
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching players'
    });
  }
};

// @desc    Get single player by ID
// @route   GET /api/players/:id
const getPlayerById = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).populate('teamId', 'name');

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.json({
      success: true,
      player: {
        id: player._id,
        teamId: player.teamId._id,
        teamName: player.teamId.name,
        playerName: player.playerName,
        position: player.position,
        contact: player.contact,
        email: player.email,
        description: player.description,
        photo: player.photo,
        createdAt: player.createdAt
      }
    });
  } catch (error) {
    console.error('Get player error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching player'
    });
  }
};

// @desc    Create new player
// @route   POST /api/players
const createPlayer = async (req, res) => {
  try {
    const { teamId, playerName, position, contact, email, description, photo } = req.body;

    // Validation
    if (!teamId || !playerName || !position || !photo) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing (teamId, playerName, position, photo)'
      });
    }

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check for duplicate player in same team
    const existingPlayer = await Player.findOne({ teamId, playerName });
    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        message: `Player "${playerName}" already exists in this team!`
      });
    }

    // Create player
    const player = await Player.create({
      teamId,
      playerName,
      position,
      contact,
      email,
      description,
      photo
    });

    res.status(201).json({
      success: true,
      message: `Player "${playerName}" added successfully!`,
      player: {
        id: player._id,
        teamId: player.teamId,
        teamName: team.name,
        playerName: player.playerName,
        position: player.position,
        contact: player.contact,
        email: player.email,
        description: player.description,
        photo: player.photo,
        createdAt: player.createdAt,
        createdDate: player.createdAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    });
  } catch (error) {
    console.error('Create player error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating player'
    });
  }
};

// @desc    Update player
// @route   PUT /api/players/:id
const updatePlayer = async (req, res) => {
  try {
    const { playerName, position, contact, email, description, photo } = req.body;

    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Check for duplicate name in same team (excluding current player)
    if (playerName && playerName !== player.playerName) {
      const existingPlayer = await Player.findOne({
        teamId: player.teamId,
        playerName,
        _id: { $ne: player._id }
      });
      
      if (existingPlayer) {
        return res.status(400).json({
          success: false,
          message: `Player "${playerName}" already exists in this team!`
        });
      }
    }

    // Update fields
    if (playerName) player.playerName = playerName;
    if (position) player.position = position;
    if (contact !== undefined) player.contact = contact;
    if (email !== undefined) player.email = email;
    if (description !== undefined) player.description = description;
    if (photo) player.photo = photo;

    await player.save();

    res.json({
      success: true,
      message: `Player "${player.playerName}" updated successfully!`,
      player: {
        id: player._id,
        playerName: player.playerName,
        position: player.position,
        contact: player.contact,
        email: player.email,
        description: player.description,
        photo: player.photo
      }
    });
  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating player'
    });
  }
};

// @desc    Delete player
// @route   DELETE /api/players/:id
const deletePlayer = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    const playerName = player.playerName;
    await Player.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Player "${playerName}" deleted successfully`
    });
  } catch (error) {
    console.error('Delete player error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting player'
    });
  }
};

// @desc    Export all players for a team
// @route   GET /api/players/export/:teamId
const exportPlayers = async (req, res) => {
  try {
    const { teamId } = req.params;

    const players = await Player.find({ teamId })
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      players: players.map(player => ({
        id: player._id,
        playerName: player.playerName,
        position: player.position,
        contact: player.contact,
        email: player.email,
        description: player.description,
        photo: player.photo,
        createdAt: player.createdAt
      }))
    });
  } catch (error) {
    console.error('Export players error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting players'
    });
  }
};

// @desc    Clear all players from a team
// @route   DELETE /api/players/clear/:teamId
const clearTeamPlayers = async (req, res) => {
  try {
    const { teamId } = req.params;

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const result = await Player.deleteMany({ teamId });

    res.json({
      success: true,
      message: 'All players cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Clear players error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing players'
    });
  }
};

module.exports = {
  getPlayersByTeam,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
  exportPlayers,
  clearTeamPlayers
};