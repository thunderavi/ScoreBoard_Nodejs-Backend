const { Match, Team, Player } = require('../models');
const { autoGenerateCommentary, broadcastToMatch } = require('./commentaryController');

// @desc    Get all matches for logged-in user
// @route   GET /api/matches
const getAllMatches = async (req, res) => {
  try {
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

// @desc    Get single match by ID
// @route   GET /api/matches/:id
const getMatchById = async (req, res) => {
  try {
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
        currentInnings: match.currentInnings,
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

// @desc    Create new match
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

    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Please login again.'
      });
    }

    if (!team1Id || !team2Id || !tossWinnerId || !coinResult || !tossChoice || !battingFirstId || !fieldingFirstId) {
      return res.status(400).json({
        success: false,
        message: 'All match setup fields are required'
      });
    }

    const [team1, team2] = await Promise.all([
      Team.findOne({ _id: team1Id, createdBy: req.session.userId }),
      Team.findOne({ _id: team2Id, createdBy: req.session.userId })
    ]);

    if (!team1 || !team2) {
      return res.status(404).json({
        success: false,
        message: 'One or both teams not found or you do not have permission'
      });
    }

    const matchData = {
      team1Id,
      team2Id,
      tossWinnerId,
      coinResult,
      tossChoice,
      battingFirstId,
      fieldingFirstId,
      createdBy: req.session.userId,
      status: 'setup',
      currentInnings: 1,
      totalOvers: 20,
      scores: [
        {
          innings: 1,
          battingTeamId: battingFirstId,
          runs: 0,
          wickets: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          overs: '0.0',
          runRate: 0,
          currentOver: [],
          extras: {
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0,
            total: 0
          },
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
          overs: '0.0',
          runRate: 0,
          currentOver: [],
          extras: {
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0,
            total: 0
          },
          target: null,
          runsNeeded: null,
          ballsRemaining: null,
          completedPlayers: [],
          currentPlayer: null
        }
      ]
    };

    const match = await Match.create(matchData);
    req.session.currentMatchId = match._id;

    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await match.populate(['team1Id', 'team2Id', 'battingFirstId', 'fieldingFirstId']);

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
        status: match.status,
        createdBy: match.createdBy
      }
    });
  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating match'
    });
  }
};

// @desc    Select current player
// @route   POST /api/matches/:id/select-player
const selectPlayer = async (req, res) => {
  try {
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: 'playerId is required'
      });
    }

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

    const player = await Player.findById(playerId).populate('teamId', 'createdBy');
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    if (player.teamId.createdBy.toString() !== req.session.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to use this player'
      });
    }

    const currentInningsNumber = match.currentInnings;
    const inningsIndex = currentInningsNumber - 1;
    const currentInnings = match.scores[inningsIndex];

    if (!currentInnings) {
      return res.status(500).json({
        success: false,
        message: 'Innings data not found'
      });
    }

    const alreadyBatted = currentInnings.completedPlayers.some(
      cp => cp.player.id.toString() === playerId.toString()
    );

    if (alreadyBatted) {
      return res.status(400).json({
        success: false,
        message: 'This player has already batted in this innings'
      });
    }

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

    res.json({
      success: true,
      player: currentInnings.currentPlayer.player,
      stats: currentInnings.currentPlayer.stats
    });
  } catch (error) {
    console.error('Select player error:', error);
    res.status(500).json({
      success: false,
      message: 'Error selecting player',
      error: error.message
    });
  }
};

// @desc    Score runs (WITH COMMENTARY)
// @route   POST /api/matches/:id/score-runs
const scoreRuns = async (req, res) => {
  try {
    const { id } = req.params;
    const { runs } = req.body;

    if (runs === undefined || runs === null) {
      return res.status(400).json({
        success: false,
        message: 'runs is required'
      });
    }

    const match = await Match.findOne({
      _id: id,
      createdBy: req.session.userId
    })
      .populate('team1Id', 'name')
      .populate('team2Id', 'name');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or you do not have permission'
      });
    }

    const currentInningsNumber = match.currentInnings;
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

    // Update overs and run rate
    currentInnings.overs = match.calculateOvers(currentInnings.balls);
    currentInnings.runRate = match.calculateRunRate(currentInnings.runs, currentInnings.balls);

    // Update current over
    if (!currentInnings.currentOver) currentInnings.currentOver = [];
    currentInnings.currentOver.push(runs);
    if (currentInnings.currentOver.length > 6) {
      currentInnings.currentOver = currentInnings.currentOver.slice(-6);
    }

    // Update runs needed for 2nd innings
    if (currentInningsNumber === 2 && match.scores[1].target) {
      match.scores[1].runsNeeded = match.scores[1].target - currentInnings.runs;
      match.scores[1].ballsRemaining = (match.totalOvers * 6) - currentInnings.balls;
    }

    await match.save();

    // Determine event type
    let eventType = 'RUNS_SCORED';
    if (runs === 4) eventType = 'FOUR';
    if (runs === 6) eventType = 'SIX';
    if (runs === 0) eventType = 'DOT_BALL';

    // Prepare event data
    const eventData = {
      innings: match.currentInnings,
      overNumber: currentInnings.overs,
      runs: runs,
      batterName: currentInnings.currentPlayer.player.playerName || 'Batsman',
      bowlerName: currentInnings.currentBowler || 'Bowler',
      battingTeam: match.currentInnings === 1 ? match.team1Id.name : match.team2Id.name,
      bowlingTeam: match.currentInnings === 1 ? match.team2Id.name : match.team1Id.name,
      teamRuns: currentInnings.runs,
      teamWickets: currentInnings.wickets,
      teamScore: `${currentInnings.runs}/${currentInnings.wickets}`,
      target: currentInnings.target,
      runsNeeded: currentInnings.runsNeeded
    };

    // Auto-generate commentary
    autoGenerateCommentary(match._id, eventType, eventData).catch(err => {
      console.error('Commentary generation failed:', err);
    });

    // Broadcast score update
    broadcastToMatch(match._id.toString(), {
      type: 'score_update',
      matchId: match._id,
      eventType,
      score: {
        runs: currentInnings.runs,
        wickets: currentInnings.wickets,
        overs: currentInnings.overs,
        runRate: currentInnings.runRate
      },
      eventData
    });

    res.json({
      success: true,
      teamStats: {
        runs: currentInnings.runs,
        wickets: currentInnings.wickets,
        balls: currentInnings.balls,
        overs: currentInnings.overs,
        runRate: currentInnings.runRate,
        fours: currentInnings.fours,
        sixes: currentInnings.sixes
      },
      playerStats: currentInnings.currentPlayer.stats
    });
  } catch (error) {
    console.error('Score runs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to score runs',
      error: error.message
    });
  }
};

// @desc    Score extras
// @route   POST /api/matches/:id/score-extra
// @desc    Score extras
// @route   POST /api/matches/:id/score-extra
const scoreExtra = async (req, res) => {
  try {
    const { type, runs } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'type is required (wide, noball, bye, legbye)'
      });
    }

    const match = await Match.findOne({
      _id: req.params.id,
      createdBy: req.session.userId
    })
      .populate('team1Id', 'name')
      .populate('team2Id', 'name');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or you do not have permission to update it'
      });
    }

    const currentInningsNumber = match.currentInnings;
    const inningsIndex = currentInningsNumber - 1;
    const currentInnings = match.scores[inningsIndex];

    // Add runs
    const extraRuns = runs || 1;
    currentInnings.runs += extraRuns;

    // Update extras
    if (!currentInnings.extras) {
      currentInnings.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
    }

    if (type === 'wide') {
      currentInnings.extras.wides += extraRuns;
      // Wide doesn't add to balls
    } else if (type === 'noball') {
      currentInnings.extras.noBalls += extraRuns;
      // No ball doesn't add to balls
    } else if (type === 'bye') {
      currentInnings.extras.byes += extraRuns;
      currentInnings.balls += 1; // Bye counts as a ball
    } else if (type === 'legbye') {
      currentInnings.extras.legByes += extraRuns;
      currentInnings.balls += 1; // Leg bye counts as a ball
    }

    currentInnings.extras.total += extraRuns;

    // Update overs and run rate
    currentInnings.overs = match.calculateOvers(currentInnings.balls);
    currentInnings.runRate = match.calculateRunRate(currentInnings.runs, currentInnings.balls);

    await match.save();

    // ✅ MAP EXTRA TYPE TO VALID EVENT TYPE
    const eventTypeMap = {
      'wide': 'WIDE',
      'noball': 'NO_BALL',  // ✅ Fixed from 'NOBALL' to 'NO_BALL'
      'bye': 'RUNS_SCORED', // Byes are just runs
      'legbye': 'RUNS_SCORED' // Leg byes are just runs
    };

    const eventType = eventTypeMap[type] || 'RUNS_SCORED';

    // Broadcast extra update
    const eventData = {
      innings: match.currentInnings,
      extraType: type,
      extraRuns: extraRuns,
      batterName: currentInnings.currentPlayer?.player?.playerName || 'Batsman',
      bowlerName: currentInnings.currentBowler || 'Bowler',
      battingTeam: match.currentInnings === 1 ? match.team1Id.name : match.team2Id.name,
      bowlingTeam: match.currentInnings === 1 ? match.team2Id.name : match.team1Id.name,
      teamRuns: currentInnings.runs,
      teamWickets: currentInnings.wickets,
      teamScore: `${currentInnings.runs}/${currentInnings.wickets}`
    };

    // ✅ Use mapped event type
    autoGenerateCommentary(match._id, eventType, eventData).catch(err => {
      console.error('Commentary generation failed:', err);
    });

    broadcastToMatch(match._id.toString(), {
      type: 'extra_scored',
      matchId: match._id,
      eventType: eventType,
      score: {
        runs: currentInnings.runs,
        wickets: currentInnings.wickets,
        overs: currentInnings.overs
      },
      eventData
    });

    res.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} scored!`,
      teamStats: {
        runs: currentInnings.runs,
        wickets: currentInnings.wickets,
        balls: currentInnings.balls,
        overs: currentInnings.overs,
        fours: currentInnings.fours,
        sixes: currentInnings.sixes,
        extras: currentInnings.extras
      }
    });
  } catch (error) {
    console.error('Score extra error:', error);
    res.status(500).json({
      success: false,
      message: 'Error scoring extra',
      error: error.message
    });
  }
};

// @desc    Player out (WITH COMMENTARY) - FIXED VERSION
// @route   POST /api/matches/:id/player-out
const playerOut = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ VALIDATE REQUEST BODY
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('❌ Empty request body received');
      return res.status(400).json({
        success: false,
        message: 'Request body is required. Please provide dismissalType.'
      });
    }
    
    const { dismissalType, fielderName } = req.body;
    
    // ✅ VALIDATE REQUIRED FIELD
    if (!dismissalType) {
      return res.status(400).json({
        success: false,
        message: 'dismissalType is required (e.g., "caught", "bowled", "runout", "lbw", "stumped")'
      });
    }

    console.log('🎯 Player Out Request:');
    console.log('  - Match ID:', id);
    console.log('  - Dismissal Type:', dismissalType);
    console.log('  - Fielder Name:', fielderName);

    const match = await Match.findOne({
      _id: id,
      createdBy: req.session.userId
    })
      .populate('team1Id', 'name')
      .populate('team2Id', 'name');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or you do not have permission'
      });
    }

    // ✅ USE match.currentInnings directly
    const currentInningsNumber = match.currentInnings;
    const inningsIndex = currentInningsNumber - 1;
    const currentInnings = match.scores[inningsIndex];

    console.log('  - Current Innings:', currentInningsNumber);
    console.log('  - Innings Index:', inningsIndex);

    if (!currentInnings.currentPlayer) {
      return res.status(400).json({
        success: false,
        message: 'No player selected. Please select a batsman first.'
      });
    }

    const batterName = currentInnings.currentPlayer.player.playerName;
    console.log('  - Batter Out:', batterName);

    // Save completed player
    currentInnings.completedPlayers.push({
      player: currentInnings.currentPlayer.player,
      stats: currentInnings.currentPlayer.stats,
      dismissalType: dismissalType,
      fielderName: fielderName || null
    });

    // Update team stats
    currentInnings.wickets += 1;
    currentInnings.balls += 1;

    // Update overs
    currentInnings.overs = match.calculateOvers(currentInnings.balls);
    currentInnings.runRate = match.calculateRunRate(currentInnings.runs, currentInnings.balls);

    // Update current over
    if (!currentInnings.currentOver) currentInnings.currentOver = [];
    currentInnings.currentOver.push('W');
    if (currentInnings.currentOver.length > 6) {
      currentInnings.currentOver = currentInnings.currentOver.slice(-6);
    }

    // Clear current player
    currentInnings.currentPlayer = null;

    await match.save();

    console.log('✅ Player marked out successfully');
    console.log('  - New Wickets:', currentInnings.wickets);
    console.log('  - Completed Players:', currentInnings.completedPlayers.length);

    // ✅ Prepare wicket event data
    const eventData = {
      innings: match.currentInnings,
      overNumber: currentInnings.overs,
      runs: 0,
      batterName: batterName,
      bowlerName: currentInnings.currentBowler || 'Bowler',
      dismissalType: dismissalType,
      fielderName: fielderName || null,
      battingTeam: match.currentInnings === 1 ? match.team1Id.name : match.team2Id.name,
      bowlingTeam: match.currentInnings === 1 ? match.team2Id.name : match.team1Id.name,
      teamRuns: currentInnings.runs,
      teamWickets: currentInnings.wickets,
      teamScore: `${currentInnings.runs}/${currentInnings.wickets}`
    };

    // ✅ Auto-generate wicket commentary
    autoGenerateCommentary(match._id, 'WICKET', eventData).catch(err => {
      console.error('Commentary generation failed:', err);
    });

    // ✅ Broadcast wicket update
    broadcastToMatch(match._id.toString(), {
      type: 'wicket',
      matchId: match._id,
      eventType: 'WICKET',
      score: {
        runs: currentInnings.runs,
        wickets: currentInnings.wickets,
        overs: currentInnings.overs
      },
      eventData
    });

    // ✅ CHECK END CONDITIONS
    let shouldEndInnings = false;
    let endReason = null;

    // Check 10 wickets
    if (currentInnings.wickets >= 10) {
      shouldEndInnings = true;
      endReason = 'All out - 10 wickets fallen';
      console.log('🏁 All out! 10 wickets fallen');
    }

    // Check target achieved (2nd innings only)
    if (currentInningsNumber === 2) {
      const targetRuns = match.scores[0].runs;
      if (currentInnings.runs > targetRuns) {
        shouldEndInnings = true;
        endReason = 'Target achieved';
        console.log('🏆 Target achieved!');
      }
    }

    // Check remaining players
    const battingTeamId = currentInnings.battingTeamId;
    const totalPlayers = await Player.countDocuments({ teamId: battingTeamId });
    const remainingPlayers = totalPlayers - currentInnings.completedPlayers.length;

    console.log('  - Total Players:', totalPlayers);
    console.log('  - Completed Players:', currentInnings.completedPlayers.length);
    console.log('  - Remaining Players:', remainingPlayers);

    if (remainingPlayers <= 0 && !shouldEndInnings) {
      shouldEndInnings = true;
      endReason = 'No more players available';
      console.log('🚫 No more players available');
    }

    // Check overs completed (20 overs = 120 balls)
    const maxBalls = match.totalOvers * 6;
    if (currentInnings.balls >= maxBalls && !shouldEndInnings) {
      shouldEndInnings = true;
      endReason = `${match.totalOvers} overs completed`;
      console.log(`⏰ ${match.totalOvers} overs completed`);
    }

    console.log('📊 End Innings Check:');
    console.log('  - Should End:', shouldEndInnings);
    console.log('  - Reason:', endReason);

    res.json({
      success: true,
      message: `${batterName} is out! (${dismissalType})`,
      teamStats: {
        runs: currentInnings.runs,
        wickets: currentInnings.wickets,
        balls: currentInnings.balls,
        overs: currentInnings.overs,
        runRate: currentInnings.runRate,
        fours: currentInnings.fours,
        sixes: currentInnings.sixes
      },
      shouldEndInnings,
      endReason,
      remainingPlayers
    });
  } catch (error) {
    console.error('❌ Player out error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record wicket',
      error: error.message
    });
  }
};

// @desc    End innings - FIXED VERSION
// @route   POST /api/matches/:id/end-innings
const endInnings = async (req, res) => {
  try {
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

    const currentInningsNumber = match.currentInnings;

    console.log('🏁 Ending Innings:', currentInningsNumber);

    if (currentInningsNumber === 1) {
      // ✅ END FIRST INNINGS, START SECOND
      match.status = 'live';
      match.currentInnings = 2;
      
      // Set target
      match.scores[1].target = match.scores[0].runs + 1;
      match.scores[1].runsNeeded = match.scores[0].runs + 1;
      match.scores[1].ballsRemaining = (match.totalOvers || 20) * 6;
      
      // ✅ ENSURE SECOND INNINGS IS CLEAN
      match.scores[1].currentPlayer = null;
      match.scores[1].completedPlayers = [];
      match.scores[1].runs = 0;
      match.scores[1].wickets = 0;
      match.scores[1].balls = 0;
      match.scores[1].fours = 0;
      match.scores[1].sixes = 0;
      match.scores[1].overs = '0.0';
      match.scores[1].runRate = 0;
      match.scores[1].currentOver = [];
      
      await match.save();

      console.log('✅ First innings ended');
      console.log('  - Target set:', match.scores[1].target);
      console.log('  - Starting innings 2');

      // ✅ Broadcast innings change
      broadcastToMatch(match._id.toString(), {
        type: 'innings_end',
        matchId: match._id,
        newInnings: 2,
        target: match.scores[1].target,
        innings1Summary: {
          runs: match.scores[0].runs,
          wickets: match.scores[0].wickets,
          overs: match.scores[0].overs
        },
        message: `Innings 1 Complete! ${match.team2Id.name} needs ${match.scores[1].target} runs to win`
      });

      // ✅ Generate innings end commentary
      const eventData = {
        innings: 1,
        battingTeam: match.team1Id.name,
        finalScore: `${match.scores[0].runs}/${match.scores[0].wickets}`,
        overs: match.scores[0].overs,
        target: match.scores[1].target,
        chasingTeam: match.team2Id.name
      };

      autoGenerateCommentary(match._id, 'INNINGS_END', eventData).catch(err => {
        console.error('Commentary generation failed:', err);
      });

      res.json({
        success: true,
        message: '1st Innings Complete! Starting 2nd Innings...',
        newInnings: 2,
        target: match.scores[1].target,
        innings1Summary: {
          runs: match.scores[0].runs,
          wickets: match.scores[0].wickets,
          overs: match.scores[0].overs,
          fours: match.scores[0].fours,
          sixes: match.scores[0].sixes
        }
      });
    } else {
      // ✅ MATCH COMPLETE
      const result = calculateMatchResult(match);
      
      match.status = 'completed';
      match.resultText = result.text;
      match.winnerId = result.winner ? result.winner.id : null;
      match.completedAt = new Date();

      await match.save();

      console.log('🏆 Match completed');
      console.log('  - Result:', result.text);
      console.log('  - Winner:', result.winner ? result.winner.name : 'Tie');

      // ✅ Broadcast match end
      broadcastToMatch(match._id.toString(), {
        type: 'match_end',
        matchId: match._id,
        result: result.text,
        winner: result.winner,
        innings1: {
          runs: match.scores[0].runs,
          wickets: match.scores[0].wickets,
          overs: match.scores[0].overs
        },
        innings2: {
          runs: match.scores[1].runs,
          wickets: match.scores[1].wickets,
          overs: match.scores[1].overs
        }
      });

      // ✅ Generate match end commentary
      const eventData = {
        winner: result.winner,
        resultText: result.text,
        innings1Score: `${match.scores[0].runs}/${match.scores[0].wickets}`,
        innings2Score: `${match.scores[1].runs}/${match.scores[1].wickets}`
      };

      autoGenerateCommentary(match._id, 'MATCH_END', eventData).catch(err => {
        console.error('Commentary generation failed:', err);
      });

      res.json({
        success: true,
        message: 'Match Complete!',
        matchComplete: true,
        result: {
          text: result.text,
          winner: result.winner
        },
        finalScores: {
          innings1: {
            team: match.team1Id.name,
            runs: match.scores[0].runs,
            wickets: match.scores[0].wickets,
            overs: match.scores[0].overs
          },
          innings2: {
            team: match.team2Id.name,
            runs: match.scores[1].runs,
            wickets: match.scores[1].wickets,
            overs: match.scores[1].overs
          }
        }
      });
    }
  } catch (error) {
    console.error('❌ End innings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error ending innings',
      error: error.message
    });
  }
};

// ✅ Helper function - Calculate match result
function calculateMatchResult(match) {
  const innings1 = match.scores[0];
  const innings2 = match.scores[1];
  const team1 = match.team1Id;
  const team2 = match.team2Id;

  // Determine which team batted first
  const team1BattedFirst = match.battingFirstId._id.toString() === team1._id.toString();

  const team1Runs = team1BattedFirst ? innings1.runs : innings2.runs;
  const team2Runs = team1BattedFirst ? innings2.runs : innings1.runs;
  const team1Wickets = team1BattedFirst ? innings1.wickets : innings2.wickets;
  const team2Wickets = team1BattedFirst ? innings2.wickets : innings1.wickets;

  console.log('📊 Calculating Match Result:');
  console.log('  - Team 1 Batted First:', team1BattedFirst);
  console.log('  - Team 1:', team1.name, 'Runs:', team1Runs, 'Wickets:', team1Wickets);
  console.log('  - Team 2:', team2.name, 'Runs:', team2Runs, 'Wickets:', team2Wickets);

  // Team 1 wins
  if (team1Runs > team2Runs) {
    const margin = team1Runs - team2Runs;
    
    // If team1 batted first, they win by runs
    if (team1BattedFirst) {
      return {
        winner: { id: team1._id, name: team1.name, logo: team1.logo },
        text: `${team1.name} wins by ${margin} runs`
      };
    } else {
      // If team1 batted second, they win by wickets
      const wicketsLeft = 10 - team1Wickets;
      return {
        winner: { id: team1._id, name: team1.name, logo: team1.logo },
        text: `${team1.name} wins by ${wicketsLeft} wickets`
      };
    }
  } 
  // Team 2 wins
  else if (team2Runs > team1Runs) {
    const margin = team2Runs - team1Runs;
    
    // If team2 batted first, they win by runs
    if (!team1BattedFirst) {
      return {
        winner: { id: team2._id, name: team2.name, logo: team2.logo },
        text: `${team2.name} wins by ${margin} runs`
      };
    } else {
      // If team2 batted second, they win by wickets
      const wicketsLeft = 10 - team2Wickets;
      return {
        winner: { id: team2._id, name: team2.name, logo: team2.logo },
        text: `${team2.name} wins by ${wicketsLeft} wickets`
      };
    }
  } 
  // Match tied
  else {
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