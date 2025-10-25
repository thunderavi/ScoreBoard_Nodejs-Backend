const { Team, Player } = require('../models');

// @desc    Get all teams with player count
// @route   GET /api/teams
const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find().sort({ createdAt: -1 });

    // Get player count for each team
    const teamsWithCount = await Promise.all(
      teams.map(async (team) => {
        const playerCount = await Player.countDocuments({ teamId: team._id });
        return {
          id: team._id,
          name: team.name,
          captain: team.captain,
          description: team.description,
          logo: team.logo,
          createdBy: team.createdBy,
          createdAt: team.createdAt,
          createdDate: team.createdAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          playerCount
        };
      })
    );

    res.json({
      success: true,
      count: teamsWithCount.length,
      teams: teamsWithCount
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teams'
    });
  }
};

// @desc    Get single team by ID
// @route   GET /api/teams/:id
const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Get player count
    const playerCount = await Player.countDocuments({ teamId: team._id });

    res.json({
      success: true,
      team: {
        id: team._id,
        name: team.name,
        captain: team.captain,
        description: team.description,
        logo: team.logo,
        createdBy: team.createdBy,
        createdAt: team.createdAt,
        playerCount
      }
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team'
    });
  }
};

// @desc    Create new team
// @route   POST /api/teams
const createTeam = async (req, res) => {
  try {
    const { name, captain, description, logo } = req.body;

    // Validation
    if (!name || !captain || !description || !logo) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check for duplicate team name
    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: `Team "${name}" already exists!`
      });
    }

    // Create team
    const team = await Team.create({
      name,
      captain,
      description,
      logo,
      createdBy: req.session.userId
    });

    res.status(201).json({
      success: true,
      message: `Team "${name}" created successfully!`,
      team: {
        id: team._id,
        name: team.name,
        captain: team.captain,
        description: team.description,
        logo: team.logo,
        createdAt: team.createdAt,
        createdDate: team.createdAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        playerCount: 0
      }
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating team'
    });
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
const updateTeam = async (req, res) => {
  try {
    const { name, captain, description, logo } = req.body;

    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check for duplicate name (excluding current team)
    if (name && name !== team.name) {
      const existingTeam = await Team.findOne({ name });
      if (existingTeam) {
        return res.status(400).json({
          success: false,
          message: `Team "${name}" already exists!`
        });
      }
    }

    // Update fields
    if (name) team.name = name;
    if (captain) team.captain = captain;
    if (description) team.description = description;
    if (logo) team.logo = logo;

    await team.save();

    res.json({
      success: true,
      message: `Team "${team.name}" updated successfully!`,
      team: {
        id: team._id,
        name: team.name,
        captain: team.captain,
        description: team.description,
        logo: team.logo
      }
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating team'
    });
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const teamName = team.name;

    // Delete all players associated with this team
    await Player.deleteMany({ teamId: team._id });

    // Delete team
    await Team.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Team "${teamName}" deleted successfully`
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting team'
    });
  }
};

// @desc    Export all teams
// @route   GET /api/teams/export/all
const exportTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      teams: teams.map(team => ({
        id: team._id,
        name: team.name,
        captain: team.captain,
        description: team.description,
        logo: team.logo,
        createdAt: team.createdAt
      }))
    });
  } catch (error) {
    console.error('Export teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting teams'
    });
  }
};

// @desc    Clear all teams
// @route   DELETE /api/teams/clear/all
const clearAllTeams = async (req, res) => {
  try {
    // Delete all players first
    await Player.deleteMany({});
    
    // Delete all teams
    const result = await Team.deleteMany({});

    res.json({
      success: true,
      message: 'All teams deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Clear teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing teams'
    });
  }
};

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  exportTeams,
  clearAllTeams
};