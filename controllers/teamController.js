const { Team, Player } = require('../models');

// @desc    Get all teams for logged-in user ONLY
// @route   GET /api/teams
const getAllTeams = async (req, res) => {
  try {
    console.log('🔍 getAllTeams called by user:', req.session.userId);
    
    // CRITICAL: Only get teams created by the logged-in user
    const teams = await Team.find({ createdBy: req.session.userId })
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${teams.length} teams for user ${req.session.userId}`);

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
    console.error('❌ Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teams'
    });
  }
};

// @desc    Get single team by ID (with ownership check)
// @route   GET /api/teams/:id
const getTeamById = async (req, res) => {
  try {
    console.log('🔍 getTeamById:', req.params.id, 'by user:', req.session.userId);
    
    // Only get team if it belongs to the logged-in user
    const team = await Team.findOne({
      _id: req.params.id,
      createdBy: req.session.userId
    });

    if (!team) {
      console.log('❌ Team not found or permission denied');
      return res.status(404).json({
        success: false,
        message: 'Team not found or you do not have permission to view it'
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
    console.error('❌ Get team error:', error);
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

    console.log('➕ Creating team:', name, 'for user:', req.session.userId);

    // Validation
    if (!name || !captain || !description || !logo) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check for duplicate team name FOR THIS USER ONLY
    const existingTeam = await Team.findOne({ 
      name, 
      createdBy: req.session.userId 
    });
    
    if (existingTeam) {
      console.log('❌ Duplicate team name for user');
      return res.status(400).json({
        success: false,
        message: `You already have a team named "${name}"!`
      });
    }

    // Create team with user ownership
    const team = await Team.create({
      name,
      captain,
      description,
      logo,
      createdBy: req.session.userId
    });

    console.log('✅ Team created:', team._id);

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
    console.error('❌ Create team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating team'
    });
  }
};

// @desc    Update team (with ownership check)
// @route   PUT /api/teams/:id
const updateTeam = async (req, res) => {
  try {
    const { name, captain, description, logo } = req.body;

    console.log('✏️ Updating team:', req.params.id, 'by user:', req.session.userId);

    // Find team and verify ownership
    const team = await Team.findOne({
      _id: req.params.id,
      createdBy: req.session.userId
    });

    if (!team) {
      console.log('❌ Team not found or permission denied');
      return res.status(404).json({
        success: false,
        message: 'Team not found or you do not have permission to update it'
      });
    }

    // Check for duplicate name FOR THIS USER (excluding current team)
    if (name && name !== team.name) {
      const existingTeam = await Team.findOne({ 
        name,
        createdBy: req.session.userId,
        _id: { $ne: team._id }
      });
      
      if (existingTeam) {
        console.log('❌ Duplicate team name for user');
        return res.status(400).json({
          success: false,
          message: `You already have a team named "${name}"!`
        });
      }
    }

    // Update fields
    if (name) team.name = name;
    if (captain) team.captain = captain;
    if (description) team.description = description;
    if (logo) team.logo = logo;

    await team.save();

    console.log('✅ Team updated');

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
    console.error('❌ Update team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating team'
    });
  }
};

// @desc    Delete team (with ownership check)
// @route   DELETE /api/teams/:id
const deleteTeam = async (req, res) => {
  try {
    console.log('🗑️ Deleting team:', req.params.id, 'by user:', req.session.userId);
    
    // Find team and verify ownership
    const team = await Team.findOne({
      _id: req.params.id,
      createdBy: req.session.userId
    });

    if (!team) {
      console.log('❌ Team not found or permission denied');
      return res.status(404).json({
        success: false,
        message: 'Team not found or you do not have permission to delete it'
      });
    }

    const teamName = team.name;

    // Delete all players associated with this team
    await Player.deleteMany({ teamId: team._id });

    // Delete team
    await Team.findByIdAndDelete(req.params.id);

    console.log('✅ Team deleted');

    res.json({
      success: true,
      message: `Team "${teamName}" deleted successfully`
    });
  } catch (error) {
    console.error('❌ Delete team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting team'
    });
  }
};

// @desc    Export all teams for logged-in user ONLY
// @route   GET /api/teams/export/all
const exportTeams = async (req, res) => {
  try {
    console.log('📤 Exporting teams for user:', req.session.userId);
    
    // Only export teams created by the logged-in user
    const teams = await Team.find({ createdBy: req.session.userId })
      .select('-__v')
      .sort({ createdAt: -1 });

    console.log(`✅ Exporting ${teams.length} teams`);

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
    console.error('❌ Export teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting teams'
    });
  }
};

// @desc    Clear all teams for logged-in user ONLY
// @route   DELETE /api/teams/clear/all
const clearAllTeams = async (req, res) => {
  try {
    console.log('🗑️ Clearing all teams for user:', req.session.userId);
    
    // Get all team IDs for this user
    const teams = await Team.find({ createdBy: req.session.userId }).select('_id');
    const teamIds = teams.map(t => t._id);

    // Delete all players for these teams
    await Player.deleteMany({ teamId: { $in: teamIds } });
    
    // Delete all teams for this user
    const result = await Team.deleteMany({ createdBy: req.session.userId });

    console.log(`✅ Deleted ${result.deletedCount} teams`);

    res.json({
      success: true,
      message: 'All your teams deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Clear teams error:', error);
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