const { Match, Team, Player } = require('../models');

// @desc    Get all matches for logged-in user
// @route   GET /api/matches
const getAllMatches = async (req, res) => {
  try {
    // Only get matches created by the logged-in user
    const matches = await Match.find({ createdBy: req.session.userId })
      .populate('team1Id', 'name logo')
      .populate('team2Id', 'name logo')
      .populate('winnerId', 'name logo')
      .sort({ createdAt: -1 })
      .limit(50);

    const matchesFormatted = matches.map(match => ({
      id: match._id,
      team1: {
        id: match.team1Id._id,
        name: match.team1Id.name,
        logo: match.team1Id.logo
      },
      team2: {
        id: match.team2Id._id,
        name: match.team2Id.name,
        logo: match.team2Id.logo
      },
      status: match.status,
      resultText: match.resultText,
      winner: match.winnerId ? {
        id: match.winnerId._id,
        name: match.winnerId.name,
        logo: match.winnerId.logo
      } : null,
      createdAt: match.createdAt,
      completedAt: match.completedAt
    }));

    res.json({
      success: true,
      count: matchesFormatted.length,
      matches: matchesFormatted
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching matches'
    });
  }
};

// @desc    Get single match by ID (with ownership check)
// @route   GET /api/matches/:id
const getMatchById = async (req, res) => {
  try {
    // Only get match if it belongs to the logged-in user
    const match = await Match.findOne({
      _id: req.params.id,
      createdBy: req.session.userId
    })
      .populate('team1Id')
      .populate('team2Id')
      .populate('tossWinnerId')
      .populate('battingFirstId')
      .populate('fieldingFirstId')
      .populate('winnerId');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or you do not have permission to view it'
      });
    }

    res.json({
      success: true,
      match: {
        id: match._id,
        team1: match.team1Id,
        team2: match.team2Id,
        tossWinner: match.tossWinnerId,
        coinResult: match.coinResult,
        tossChoice: match.tossChoice,
        battingFirst: match.battingFirstId,
        fieldingFirst: match.fieldingFirstId,
        status: match.status,
        resultText: match.resultText,
        winner: match.winnerId,
        innings1Score: match.scores[0],
        innings2Score: match.scores[1],
        createdAt: match.createdAt,
        completedAt: match.completedAt
      }
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching match'
    });
  }
};

// @desc    Create new match (setup with toss) - with ownership check
// @route   POST /api/matches
const createMatch = async (req, res) => {
  try {
    const {
      team1Id,
      team2Id,
      tossWinnerId,
      coinResult,
      tossChoice,
      battingFirstId,
      fieldingFirstId
    } = req.body;

    console.log('🔥 Create Match Request:');
    console.log('  - team1Id:', team1Id);
    console.log('  - team2Id:', team2Id);
    console.log('  - User ID:', req.session.userId);

    // Validation
    if (!team1Id || !team2Id || !tossWinnerId || !coinResult || !tossChoice || !battingFirstId || !fieldingFirstId) {
      return res.status(400).json({
        success: false,
        message: 'All match setup fields are required'
      });
    }

    // Check if BOTH teams exist AND belong to the logged-in user
    const [team1, team2] = await Promise.all([
      Team.findOne({ _id: team1Id, createdBy: req.session.userId }),
      Team.findOne({ _id: team2Id, createdBy: req.session.userId })
    ]);

    if (!team1 || !team2) {
      return res.status(404).json({
        success: false,
        message: 'One or both teams not found or you do not have permission to use them'
      });
    }

    // Create match with user ownership
    const match = await Match.create({
      team1Id,
      team2Id,
      tossWinnerId,
      coinResult,
      tossChoice,
      battingFirstId,
      fieldingFirstId,
      createdBy: req.session.userId, // Add user ownership
      status: 'setup',
      scores: [
        {
          innings: 1,
          battingTeamId: battingFirstId,
          runs: 0,
          wickets: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          completedPlayers: [],
          currentPlayer: null
        },
        {
          innings: 2,
          battingTeamId: fieldingFirstId,
          runs: 0,
          wickets: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          completedPlayers: [],
          currentPlayer: null
        }
      ]
    });

    // Store match ID in session
    req.session.currentMatchId = match._id;

    await match.populate(['team1Id', 'team2Id', 'battingFirstId', 'fieldingFirstId']);

    console.log('✅ Match created successfully:', match._id);

    res.status(201).json({
      success: true,
      message: 'Match setup saved successfully',
      matchId: match._id,
      match: {
        _id: match._id,
        id: match._id,
        team1: match.team1Id,
        team2: match.team2Id,
        battingFirst: match.battingFirstId,
        fieldingFirst: match.fieldingFirstId,
        status: match.status
      }
    });
  } catch (error) {
    console.error('❌ Create match error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating match'
    });
  }
};

// @desc    Select current player (with ownership check)
// @route   POST /api/matches/:id/select-player
const selectPlayer = async (req, res) => {
  try {
    const { playerId } = req.body;

    console.log('🎯 Select Player Request:');
    console.log('  - Match ID:', req.params.id);
    console.log('  - Player ID:', playerId);

    // Find match and verify ownership
    const match = await Match.findOne({
      _id: req.params.id,
      createdBy: req.session.userId
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or you do not have permission to update it'
      });
    }

    console.log('  - Match status:', match.status);

    // Get player details and verify it belongs to user's team
    const player = await Player.findById(playerId).populate('teamId', 'createdBy');
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Verify player's team belongs to the user
    if (player.teamId.createdBy.toString() !== req.session.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to use this player'
      });
    }

    console.log('  - Player found:', player.playerName);

    // Determine current innings based on match status
    let currentInningsNumber = match.status === 'live' ? 2 : 1;
    const inningsIndex = currentInningsNumber - 1;
    
    const currentInnings = match.scores[inningsIndex];

    if (!currentInnings) {
      console.error('❌ Current innings not found!');
      return res.status(500).json({
        success: false,
        message: 'Innings data not found'
      });
    }

    // Check if player already batted
    const alreadyBatted = currentInnings.completedPlayers.some(
      cp => cp.player.id.toString() === playerId.toString()
    );

    if (alreadyBatted) {
      return res.status(400).json({
        success: false,
        message: 'This player has already batted in this innings'
      });
    }

    // Set current player
    currentInnings.currentPlayer = {
      player: {
        id: player._id,
        playerName: player.playerName,
        position: player.position,
        photo: player.photo,
        teamId: player.teamId._id
      },
      stats: {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0
      }
    };

    await match.save();

    console.log('✅ Player selected successfully:', currentInnings.currentPlayer.player.playerName);

    res.json({
      success: true,
      player: currentInnings.currentPlayer.player,
      stats: currentInnings.currentPlayer.stats
    });
  } catch (error) {
    console.error('❌ Select player error:', error);
    res.status(500).json({
      success: false,
      message: 'Error selecting player',
      error: error.message
    });
  }
};

// @desc    Score runs (with ownership check)
// @route   POST /api/matches/:id/score-runs
const scoreRuns = async (req, res) => {
  try {
    const { runs } = req.body;

    // Find match and verify ownership
    const match = await Match.findOne({
      _id: req.params.id,
      createdBy: req.session.userId
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or you do not have permission to update it'
      });
    }

    // Determine current innings
    const currentInningsNumber = match.status === 'live' ? 2 : 1;
    const inningsIndex = currentInningsNumber - 1;
    const currentInnings = match.scores[inningsIndex];

    if (!currentInnings.currentPlayer) {
      return res.status(400).json({
        success: false,
        message: 'No player selected'
      });
    }

    // Update player stats
    currentInnings.currentPlayer.stats.runs += runs;
    currentInnings.currentPlayer.stats.balls += 1;
    if (runs === 4) currentInnings.currentPlayer.stats.fours += 1;
    if (runs === 6) currentInnings.currentPlayer.stats.sixes += 1;

    // Update team stats
    currentInnings.runs += runs;
    currentInnings.balls += 1;
    if (runs === 4) currentInnings.fours += 1;
    if (runs === 6) currentInnings.sixes += 1;

    await match.save();

    res.json({
      success: true,
      teamStats: {
        runs: currentInnings.runs,
        wickets: currentInnings.wickets,
        balls: currentInnings.balls,
        fours: currentInnings.fours,
        sixes: currentInnings.sixes
      },
      playerStats: currentInnings.currentPlayer.stats
    });
  } catch (error) {
    console.error('Score runs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error scoring runs'
    });
  }
};

// @desc    Score extras (with ownership check)
// @route   POST /api/matches/:id/score-extra
const scoreExtra = async (req, res) => {
  try {
    const { type, runs } = req.body;

    // Find match and verify ownership
    const match = await Match.findOne({
      _id: req.params.id,
      createdBy: req.session.userId
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or you do not have permission to update it'
      });
    }

    // Determine current innings
    const currentInningsNumber = match.status === 'live' ? 2 : 1;
    const inningsIndex = currentInningsNumber - 1;
    const currentInnings = match.scores[inningsIndex];

    // Add runs to team
    currentInnings.runs += runs || 1;

    // Only add ball for bye/leg-bye
    if (type === 'bye' || type === 'legbye') {
      currentInnings.balls += 1;
    }

    await match.save();

    res.json({
      success: true,
      teamStats: {
        runs: currentInnings.runs,
        wickets: currentInnings.wickets,
        balls: currentInnings.balls,
        fours: currentInnings.fours,
        sixes: currentInnings.sixes
      }
    });
  } catch (error) {
    console.error('Score extra error:', error);
    res.status(500).json({
      success: false,
      message: 'Error scoring extra'
    });
  }
};

// @desc    Player out (with ownership check)
// @route   POST /api/matches/:id/player-out
const playerOut = async (req, res) => {
  try {
    // Find match and verify ownership
    const match = await Match.findOne({
      _id: req.params.id,
      createdBy: req.session.userId
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or you do not have permission to update it'
      });
    }

    // Determine current innings
    const currentInningsNumber = match.status === 'live' ? 2 : 1;
    const inningsIndex = currentInningsNumber - 1;
    const currentInnings = match.scores[inningsIndex];

    if (!currentInnings.currentPlayer) {
      return res.status(400).json({
        success: false,
        message: 'No player selected'
      });
    }

    // Save completed player
    currentInnings.completedPlayers.push(currentInnings.currentPlayer);

    // Update team stats
    currentInnings.wickets += 1;
    currentInnings.balls += 1;

    // Clear current player
    currentInnings.currentPlayer = null;

    await match.save();

    // Check end conditions
    let shouldEndInnings = false;
    let endReason = null;

    if (currentInnings.wickets >= 10) {
      shouldEndInnings = true;
      endReason = 'All out - 10 wickets fallen';
    }

    // Check target for 2nd innings
    if (currentInningsNumber === 2) {
      const targetRuns = match.scores[0].runs;
      if (currentInnings.runs > targetRuns) {
        shouldEndInnings = true;
        endReason = 'Target achieved';
      }
    }

    // Get remaining players
    const battingTeamId = currentInnings.battingTeamId;
    const totalPlayers = await Player.countDocuments({ teamId: battingTeamId });
    const remainingPlayers = totalPlayers - currentInnings.completedPlayers.length;

    if (remainingPlayers <= 0) {
      shouldEndInnings = true;
      endReason = 'No more players available';
    }

    res.json({
      success: true,
      teamStats: {
        runs: currentInnings.runs,
        wickets: currentInnings.wickets,
        balls: currentInnings.balls,
        fours: currentInnings.fours,
        sixes: currentInnings.sixes
      },
      shouldEndInnings,
      endReason,
      remainingPlayers
    });
  } catch (error) {
    console.error('Player out error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking player out'
    });
  }
};

// @desc    End innings (with ownership check)
// @route   POST /api/matches/:id/end-innings
const endInnings = async (req, res) => {
  try {
    // Find match and verify ownership
    const match = await Match.findOne({
      _id: req.params.id,
      createdBy: req.session.userId
    })
      .populate('team1Id')
      .populate('team2Id')
      .populate('battingFirstId')
      .populate('fieldingFirstId');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or you do not have permission to update it'
      });
    }

    // Determine current innings
    const currentInningsNumber = match.status === 'live' ? 2 : 1;

    if (currentInningsNumber === 1) {
      // End 1st innings, start 2nd
      match.status = 'live';
      match.scores[1].currentPlayer = null;
      await match.save();

      res.json({
        success: true,
        message: '1st Innings Complete! Starting 2nd Innings...',
        newInnings: 2
      });
    } else {
      // End 2nd innings, complete match
      const result = calculateMatchResult(match);
      
      match.status = 'completed';
      match.resultText = result.text;
      match.winnerId = result.winner ? result.winner.id : null;
      match.innings1Data = match.scores[0];
      match.innings2Data = match.scores[1];
      match.completedAt = new Date();

      await match.save();

      res.json({
        success: true,
        message: 'Match Complete!',
        matchComplete: true,
        result
      });
    }
  } catch (error) {
    console.error('End innings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error ending innings'
    });
  }
};

// Helper function to calculate match result
function calculateMatchResult(match) {
  const innings1 = match.scores[0];
  const innings2 = match.scores[1];
  const team1 = match.team1Id;
  const team2 = match.team2Id;

  const team1BattedFirst = match.battingFirstId._id.toString() === team1._id.toString();

  const team1Runs = team1BattedFirst ? innings1.runs : innings2.runs;
  const team2Runs = team1BattedFirst ? innings2.runs : innings1.runs;
  const team2Wickets = team1BattedFirst ? innings2.wickets : innings1.wickets;

  if (team1Runs > team2Runs) {
    const margin = team1Runs - team2Runs;
    return {
      winner: { id: team1._id, name: team1.name, logo: team1.logo },
      text: `${team1.name} wins by ${margin} runs`
    };
  } else if (team2Runs > team1Runs) {
    const wicketsLeft = 10 - team2Wickets;
    return {
      winner: { id: team2._id, name: team2.name, logo: team2.logo },
      text: `${team2.name} wins by ${wicketsLeft} wickets`
    };
  } else {
    return {
      winner: null,
      text: 'Match Tied!'
    };
  }
}

module.exports = {
  getAllMatches,
  getMatchById,
  createMatch,
  selectPlayer,
  scoreRuns,
  scoreExtra,
  playerOut,
  endInnings
};