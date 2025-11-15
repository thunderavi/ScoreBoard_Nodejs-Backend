const { Commentary, Match, Team } = require('../models');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const { allowedOrigins } = require('../config/cors');

// Initialize Gemini - Clean and validate API key
const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

if (!geminiApiKey) {
  console.error('❌ GEMINI_API_KEY not found in environment variables!');
} else {
  console.log('✅ Gemini API Key loaded:', geminiApiKey.substring(0, 20) + '...');
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

// Initialize Google Cloud Text-to-Speech
const ttsClient = new textToSpeech.TextToSpeechClient();

// Store active SSE connections for each match with metadata
const matchConnections = new Map();

// Connection cleanup interval
const CONNECTION_CLEANUP_INTERVAL = 30000; // 30 seconds
let cleanupInterval = null;

// ============================================
// CONNECTION CLEANUP
// ============================================

function startConnectionCleanup() {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    console.log('🧹 Running connection cleanup...');
    let totalCleaned = 0;
    
    matchConnections.forEach((connections, matchId) => {
      const deadConnections = [];
      
      connections.forEach((conn, index) => {
        if (conn.res.writableEnded || conn.res.destroyed) {
          deadConnections.push(index);
        }
      });
      
      for (let i = deadConnections.length - 1; i >= 0; i--) {
        connections.splice(deadConnections[i], 1);
        totalCleaned++;
      }
      
      if (connections.length === 0) {
        matchConnections.delete(matchId);
        console.log(`🗑️ Removed empty match: ${matchId}`);
      }
    });
    
    if (totalCleaned > 0) {
      console.log(`✅ Cleaned ${totalCleaned} dead connections`);
    }
  }, CONNECTION_CLEANUP_INTERVAL);
  
  console.log('✅ Connection cleanup started');
}

function stopConnectionCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('🛑 Connection cleanup stopped');
  }
}

// Start cleanup on module load
startConnectionCleanup();

// ============================================
// ENHANCED FALLBACK COMMENTARY TEMPLATES
// ============================================

const FALLBACK_COMMENTARY = {
  SIX: [
    "Massive! {batter} sends it sailing into the stands!",
    "What a hit! {batter} absolutely crunches that for six!",
    "Gone! That's disappeared over the boundary for a maximum!",
    "{batter} connects perfectly! That's gone miles for six runs!",
    "Unbelievable power! {batter} launches it for a huge six!"
  ],
  FOUR: [
    "Glorious stroke! {batter} finds the gap perfectly for four!",
    "Beautiful timing! That races to the boundary for four runs!",
    "{batter} threads the needle! Four runs added!",
    "Delightful shot! {batter} caresses it to the fence!",
    "Precision at its best! {batter} picks up four valuable runs!"
  ],
  WICKET: [
    "Gone! {batter} departs, that's a massive blow!",
    "Breakthrough! {bowler} strikes! {batter} has to walk back!",
    "What a delivery! {batter} is out, {dismissalType}!",
    "Drama! {batter} falls, that's a crucial wicket!",
    "{bowler} does the trick! {batter} is dismissed!"
  ],
  RUNS_SCORED: [
    "Smart cricket! {batter} rotates the strike",
    "Good running! They scamper through for {runs}",
    "{batter} keeps the scoreboard ticking with {runs} run(s)",
    "Sensible batting! {runs} run(s) added to the total",
    "{batter} works it into the gap for {runs}"
  ],
  DOT_BALL: [
    "Tight bowling! {bowler} builds the pressure with another dot",
    "Well defended! {batter} keeps it out",
    "Excellent line and length from {bowler}",
    "{bowler} maintains control, no run there",
    "Solid defense from {batter}, dot ball"
  ],
  WIDE: [
    "That's wayward! Wide called, extra run conceded",
    "Pressure showing! That's gone down the leg side for a wide",
    "Poor delivery! The umpire signals wide",
    "Straying down leg! That's a wide ball",
    "Bonus run! Wide ball called by the umpire"
  ],
  NO_BALL: [
    "Overstepped! No ball, free hit coming up!",
    "That's a big no ball! Free hit next delivery!",
    "Extra run! {bowler} has overstepped the crease",
    "No ball! This is a gift for the batting side",
    "{bowler} oversteps! Free hit opportunity now!"
  ],
  INNINGS_END: [
    "That's the end of a fascinating innings! Final score: {score}",
    "Innings concluded! {team} finish at {score}",
    "And that brings the innings to a close at {score}",
    "The innings wraps up! {team} post {score}",
    "That's it! {team} manage {score} from their innings"
  ],
  DEFAULT: [
    "Play continues in this exciting contest",
    "Another delivery bowled, the game moves forward",
    "The match progresses, tension building"
  ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateFallbackCommentary(eventType, context, eventData) {
  const templates = FALLBACK_COMMENTARY[eventType] || FALLBACK_COMMENTARY.DEFAULT;
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  let commentary = template
    .replace('{batter}', eventData.batterName || 'The batsman')
    .replace('{bowler}', eventData.bowlerName || 'The bowler')
    .replace('{team}', context.battingTeam || 'The team')
    .replace('{score}', context.currentScore)
    .replace('{runs}', eventData.runs || '1')
    .replace('{dismissalType}', eventData.dismissalType || '');
  
  // Add score context where appropriate
  if (context && ['SIX', 'FOUR', 'WICKET'].includes(eventType)) {
    commentary += ` Score: ${context.currentScore} after ${context.overs} overs.`;
  }
  
  // Add match situation context
  if (context.target && context.runsNeeded !== undefined) {
    commentary += ` ${context.runsNeeded} needed from ${calculateRemainingBalls(context.overs, context.totalOvers)} balls.`;
  }
  
  return commentary;
}

function calculateRemainingBalls(currentOvers, totalOvers) {
  const oversFloat = parseFloat(currentOvers);
  const totalOversFloat = parseFloat(totalOvers || 20);
  const remainingOvers = totalOversFloat - oversFloat;
  const balls = Math.floor(remainingOvers) * 6 + Math.round((remainingOvers % 1) * 10);
  return balls;
}

function buildCommentaryContext(match, eventType, eventData) {
  const currentScore = match.scores.find(s => s.innings === match.currentInnings);
  const overs = currentScore?.overs || '0.0';
  const oversFloat = parseFloat(overs);
  
  // Calculate run rate
  const runRate = oversFloat > 0 ? (currentScore?.runs / oversFloat).toFixed(2) : '0.00';
  
  // Calculate required run rate if chasing
  const runsNeeded = currentScore?.runsNeeded;
  const totalOvers = match.totalOvers || 20;
  const remainingOvers = totalOvers - oversFloat;
  const requiredRunRate = (runsNeeded && remainingOvers > 0) 
    ? (runsNeeded / remainingOvers).toFixed(2) 
    : null;
  
  // Determine match phase
  const matchPhase = getMatchPhase(oversFloat, totalOvers);
  
  // Determine match situation
  const situation = getMatchSituation(currentScore, match.currentInnings, match);
  
  return {
    battingTeam: eventData.battingTeam,
    bowlingTeam: eventData.bowlingTeam,
    currentScore: `${currentScore?.runs || 0}/${currentScore?.wickets || 0}`,
    runs: currentScore?.runs || 0,
    wickets: currentScore?.wickets || 0,
    overs: overs,
    oversFloat: oversFloat,
    batterName: eventData.batterName,
    bowlerName: eventData.bowlerName,
    innings: match.currentInnings,
    target: currentScore?.target,
    runsNeeded: runsNeeded,
    runRate: runRate,
    requiredRunRate: requiredRunRate,
    totalOvers: totalOvers,
    matchPhase: matchPhase,
    situation: situation,
    recentEvents: eventData.recentEvents || []
  };
}

function getMatchPhase(overs, totalOvers) {
  const progress = (overs / totalOvers) * 100;
  if (progress < 20) return 'powerplay';
  if (progress < 50) return 'middle';
  if (progress < 80) return 'death';
  return 'final';
}

function getMatchSituation(currentScore, innings, match) {
  if (innings === 1) {
    return 'setting_target';
  }
  
  const runsNeeded = currentScore?.runsNeeded;
  const wickets = currentScore?.wickets || 0;
  
  if (!runsNeeded) return 'chasing';
  
  if (runsNeeded <= 0) return 'won';
  if (wickets >= 10) return 'lost';
  if (runsNeeded < 20) return 'tight_finish';
  if (runsNeeded < 50) return 'close_chase';
  if (runsNeeded > 100) return 'difficult_chase';
  
  return 'chasing';
}

async function generateCommentaryText(context, eventType, eventData) {
  const prompt = createEnhancedPromptForEvent(eventType, context, eventData);
  
  const systemInstruction = `You are a passionate cricket commentator with deep knowledge of the game. Generate exciting, contextual commentary that:
- Varies based on match situation (score, run rate, pressure, wickets remaining)
- References the specific phase of the match (powerplay, middle overs, death overs)
- Mentions player names naturally
- Uses cricket terminology appropriately
- Keeps commentary under 50 words but makes every word count
- Changes tone based on context (desperate chase, comfortable position, nail-biter)
- Adds strategic insights when relevant
- Never repeats the same phrases - be creative and varied`;

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp',
    systemInstruction: systemInstruction
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text().trim();
}

function createEnhancedPromptForEvent(eventType, context, eventData) {
  const baseContext = `Match Context:
- Batting Team: ${context.battingTeam}
- Score: ${context.currentScore} in ${context.overs} overs
- Current Run Rate: ${context.runRate}
- Match Phase: ${context.matchPhase}
- Situation: ${context.situation}`;

  const chasingContext = context.target ? `
- Target: ${context.target}
- Runs Needed: ${context.runsNeeded}
- Required Run Rate: ${context.requiredRunRate}
- Wickets Left: ${10 - context.wickets}` : '';

  switch (eventType) {
    case 'SIX':
      return `${baseContext}${chasingContext}

${context.batterName} just launched a MASSIVE SIX! 

Consider:
- If chasing, how does this impact the required run rate?
- Is this a pressure release or momentum shift?
- What does this mean for the match situation?
- Is the bowler under pressure now?

Generate thrilling, situational commentary that captures the moment's significance.`;
    
    case 'FOUR':
      return `${baseContext}${chasingContext}

${context.batterName} finds the boundary with a beautiful FOUR!

Consider:
- Quality of the shot (timing, placement, power)
- Impact on the match situation
- Is this good running between wickets or pure class?
- How does this affect the bowler's confidence?

Generate elegant commentary highlighting the stroke's significance.`;
    
    case 'WICKET':
      return `${baseContext}${chasingContext}

WICKET! ${context.batterName} is OUT - ${eventData.dismissalType}!
${context.bowlerName} gets the breakthrough!

Consider:
- Is this a crucial wicket or a tail-ender?
- Impact on team's chances
- Turning point in the match?
- How many wickets remain?
- If chasing, does this make the target harder?

Generate dramatic, impactful commentary about this key moment.`;
    
    case 'RUNS_SCORED':
      const runsScored = eventData.runs || 1;
      return `${baseContext}${chasingContext}

${context.batterName} works it for ${runsScored} run(s). ${context.bowlerName} bowling.

Consider:
- Is this good strike rotation or desperate singles?
- Match pressure - building or releasing?
- Run rate implications
- Strategic importance of keeping scoreboard ticking

Generate concise, smart commentary about the game's flow.`;
    
    case 'DOT_BALL':
      return `${baseContext}${chasingContext}

Dot ball! ${context.bowlerName} to ${context.batterName}.

Consider:
- Pressure building on batsman?
- Good bowling or defensive play?
- Impact of dot balls in this match phase
- Run rate pressure increasing?

Generate sharp commentary about the building tension.`;
    
    case 'WIDE':
      return `${baseContext}${chasingContext}

WIDE BALL! ${context.bowlerName} strays. Extra run!

Consider:
- Pressure on bowler?
- Gift to batting team?
- Impact on required run rate if chasing
- Loss of line and length?

Generate commentary about this mistake and its consequences.`;
    
    case 'NO_BALL':
      return `${baseContext}${chasingContext}

NO BALL! ${context.bowlerName} oversteps! FREE HIT next!

Consider:
- Costly mistake at this stage?
- Opportunity for big runs
- Pressure on the fielding side
- How critical is this free hit?

Generate exciting commentary about this massive opportunity.`;
    
    case 'INNINGS_END':
      return `${baseContext}

INNINGS OVER! ${context.battingTeam} finish at ${context.currentScore} in ${context.overs} overs.
Run Rate: ${context.runRate}

Evaluate:
- Was this a good score for this pitch?
- Defendable/Chaseable total?
- Key moments in the innings
- What's required in the chase?

Generate comprehensive innings summary with insights.`;
    
    default:
      return `${baseContext}${chasingContext}

Event: ${eventType}

Generate appropriate, contextual commentary for this moment considering the overall match situation.`;
  }
}

function determinePriority(eventType) {
  const priorityMap = {
    'SIX': 'high',
    'FOUR': 'high',
    'WICKET': 'critical',
    'INNINGS_END': 'critical',
    'MATCH_END': 'critical',
    'RUNS_SCORED': 'medium',
    'DOT_BALL': 'low',
    'WIDE': 'low',
    'NO_BALL': 'medium'
  };
  return priorityMap[eventType] || 'medium';
}

function estimateAudioDuration(text) {
  const words = text.split(' ').length;
  const minutes = words / 150;
  return parseFloat((minutes * 60).toFixed(1));
}

// ============================================
// GENERATE COMMENTARY TEXT
// ============================================
exports.generateCommentary = async (req, res) => {
  try {
    const { matchId, eventType, eventData } = req.body;

    if (!matchId || !eventType || !eventData) {
      return res.status(400).json({
        success: false,
        message: 'matchId, eventType, and eventData are required'
      });
    }

    const match = await Match.findById(matchId)
      .populate('team1Id', 'name')
      .populate('team2Id', 'name');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const context = buildCommentaryContext(match, eventType, eventData);
    
    let commentaryText;
    let isAIGenerated = true;
    
    try {
      commentaryText = await generateCommentaryText(context, eventType, eventData);
    } catch (geminiError) {
      console.warn('⚠️ Gemini failed, using fallback commentary:', geminiError.message);
      commentaryText = generateFallbackCommentary(eventType, context, eventData);
      isAIGenerated = false;
    }

    const commentary = await Commentary.create({
      matchId,
      eventType,
      commentaryText,
      eventData,
      priority: determinePriority(eventType),
      isAIGenerated,
    });

    res.json({
      success: true,
      commentary: {
        id: commentary._id,
        text: commentaryText,
        eventType,
        isAIGenerated,
        createdAt: commentary.createdAt
      }
    });

  } catch (error) {
    console.error('Generate commentary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate commentary',
      error: error.message
    });
  }
};

// ============================================
// SYNTHESIZE SPEECH (TEXT TO AUDIO)
// ============================================
exports.synthesizeSpeech = async (req, res) => {
  try {
    const { commentaryId, text, voice = 'en-US-Neural2-J' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    let audioUrl = null;
    let audioDuration = 0;
    
    try {
      const request = {
        input: { text: text },
        voice: { 
          languageCode: 'en-US', 
          name: voice,
        },
        audioConfig: { 
          audioEncoding: 'MP3',
          speakingRate: 1.0
        },
      };

      const [response] = await ttsClient.synthesizeSpeech(request);

      const audioDir = path.join(__dirname, '../public/audio');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      const fileName = `commentary_${Date.now()}.mp3`;
      const filePath = path.join(audioDir, fileName);
      fs.writeFileSync(filePath, response.audioContent, 'binary');

      audioUrl = `/audio/${fileName}`;
      audioDuration = estimateAudioDuration(text);

      if (commentaryId) {
        await Commentary.findByIdAndUpdate(commentaryId, {
          audioUrl,
          audioDuration
        });
      }
    } catch (ttsError) {
      console.warn('⚠️ TTS failed, continuing without audio:', ttsError.message);
    }

    res.json({
      success: true,
      audioUrl,
      fileName: audioUrl ? path.basename(audioUrl) : null,
      audioDuration,
      hasAudio: !!audioUrl
    });

  } catch (error) {
    console.error('Synthesize speech error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to synthesize speech',
      error: error.message
    });
  }
};

// ============================================
// GET MATCH COMMENTARY HISTORY
// ============================================
exports.getMatchCommentary = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { limit = 20, eventType } = req.query;

    const query = { matchId };
    if (eventType) {
      query.eventType = eventType;
    }

    const commentary = await Commentary.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: commentary.length,
      commentary
    });

  } catch (error) {
    console.error('Get commentary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commentary',
      error: error.message
    });
  }
};

// ============================================
// GENERATE COMMENTARY WITH AUDIO (Combined)
// ============================================
exports.generateCommentaryWithAudio = async (req, res) => {
  try {
    const { matchId, eventType, eventData, voice = 'en-US-Neural2-J' } = req.body;

    if (!matchId || !eventType || !eventData) {
      return res.status(400).json({
        success: false,
        message: 'matchId, eventType, and eventData are required'
      });
    }

    const match = await Match.findById(matchId)
      .populate('team1Id', 'name')
      .populate('team2Id', 'name');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const context = buildCommentaryContext(match, eventType, eventData);
    
    let commentaryText;
    let isAIGenerated = true;
    
    try {
      commentaryText = await generateCommentaryText(context, eventType, eventData);
    } catch (geminiError) {
      console.warn('⚠️ Gemini failed, using fallback commentary:', geminiError.message);
      commentaryText = generateFallbackCommentary(eventType, context, eventData);
      isAIGenerated = false;
    }

    let audioUrl = null;
    let audioDuration = 0;
    
    try {
      const ttsRequest = {
        input: { text: commentaryText },
        voice: { 
          languageCode: 'en-US', 
          name: voice,
        },
        audioConfig: { 
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0
        },
      };

      const [ttsResponse] = await ttsClient.synthesizeSpeech(ttsRequest);

      const audioDir = path.join(__dirname, '../public/audio');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      const fileName = `commentary_${Date.now()}.mp3`;
      const filePath = path.join(audioDir, fileName);
      fs.writeFileSync(filePath, ttsResponse.audioContent, 'binary');
      audioUrl = `/audio/${fileName}`;
      audioDuration = estimateAudioDuration(commentaryText);
      
      console.log(`🎵 Audio synthesized: ${fileName} (${audioDuration}s)`);
    } catch (ttsError) {
      console.warn('⚠️ TTS failed, continuing without audio:', ttsError.message);
    }

    const commentary = await Commentary.create({
      matchId,
      eventType,
      commentaryText,
      audioUrl,
      audioDuration,
      eventData,
      priority: determinePriority(eventType),
      isAIGenerated,
    });

    res.json({
      success: true,
      commentary: {
        id: commentary._id,
        text: commentaryText,
        audioUrl,
        audioDuration: commentary.audioDuration,
        eventType,
        isAIGenerated,
        hasAudio: !!audioUrl,
        createdAt: commentary.createdAt
      }
    });

  } catch (error) {
    console.error('Generate commentary with audio error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate commentary with audio',
      error: error.message
    });
  }
};

// ============================================
// REAL-TIME STREAM (Server-Sent Events)
// ============================================
exports.streamMatchEvents = async (req, res) => {
  const { matchId } = req.params;
  const origin = req.headers.origin;
  const clientId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  try {
    res.write(`data: ${JSON.stringify({ type: 'connected', matchId, clientId })}\n\n`);
  } catch (writeError) {
    console.error('❌ Failed to write initial message:', writeError.message);
    return;
  }

  if (!matchConnections.has(matchId)) {
    matchConnections.set(matchId, []);
  }
  
  const connectionData = {
    res,
    clientId,
    connectedAt: new Date(),
    lastActivity: new Date()
  };
  
  matchConnections.get(matchId).push(connectionData);

  console.log(`✅ New SSE connection [${clientId}] for match ${matchId}. Total: ${matchConnections.get(matchId).length}`);

  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
      connectionData.lastActivity = new Date();
    } catch (error) {
      console.error(`❌ Heartbeat failed for ${clientId}:`, error.message);
      clearInterval(heartbeatInterval);
    }
  }, 15000);

  const cleanup = () => {
    clearInterval(heartbeatInterval);
    
    const connections = matchConnections.get(matchId);
    if (connections) {
      const index = connections.findIndex(conn => conn.clientId === clientId);
      if (index !== -1) {
        connections.splice(index, 1);
        console.log(`❌ SSE connection [${clientId}] closed for match ${matchId}. Remaining: ${connections.length}`);
      }
      
      if (connections.length === 0) {
        matchConnections.delete(matchId);
        console.log(`🗑️ No more connections for match ${matchId}, cleaned up`);
      }
    }
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('error', cleanup);
  res.on('finish', cleanup);
};

// ============================================
// BROADCAST EVENT TO ALL CONNECTED CLIENTS
// ============================================
function broadcastToMatch(matchId, eventData) {
  const connections = matchConnections.get(matchId);
  
  if (!connections || connections.length === 0) {
    console.log(`ℹ️ No active connections for match ${matchId}`);
    return;
  }

  console.log(`📡 Broadcasting to ${connections.length} clients for match ${matchId}`);
  
  const data = JSON.stringify(eventData);
  const deadConnections = [];
  
  connections.forEach((conn, index) => {
    try {
      if (conn.res.writable && !conn.res.writableEnded && !conn.res.destroyed) {
        conn.res.write(`data: ${data}\n\n`);
        conn.lastActivity = new Date();
      } else {
        deadConnections.push(index);
      }
    } catch (error) {
      console.error(`❌ Error broadcasting to connection [${conn.clientId}]:`, error.message);
      deadConnections.push(index);
    }
  });
  
  for (let i = deadConnections.length - 1; i >= 0; i--) {
    const conn = connections[deadConnections[i]];
    console.log(`🗑️ Removing dead connection [${conn.clientId}]`);
    connections.splice(deadConnections[i], 1);
  }
  
  if (connections.length === 0) {
    matchConnections.delete(matchId);
    console.log(`🗑️ No more connections for match ${matchId}, cleaned up`);
  }
}

// ============================================
// AUTO-GENERATE COMMENTARY
// ============================================
exports.autoGenerateCommentary = async (matchId, eventType, eventData) => {
  try {
    console.log(`🎙️ Auto-generating commentary for ${eventType}`);

    const match = await Match.findById(matchId)
      .populate('team1Id', 'name')
      .populate('team2Id', 'name');

    if (!match) {
      console.error('Match not found');
      return null;
    }

    const context = buildCommentaryContext(match, eventType, eventData);
    
    let commentaryText;
    let isAIGenerated = true;
    
    try {
      commentaryText = await generateCommentaryText(context, eventType, eventData);
    } catch (geminiError) {
      console.warn('⚠️ Gemini failed, using fallback commentary:', geminiError.message);
      commentaryText = generateFallbackCommentary(eventType, context, eventData);
      isAIGenerated = false;
      
      broadcastToMatch(matchId.toString(), {
        type: 'error',
        message: 'AI commentary temporarily unavailable. Using fallback commentary.',
        errorCode: 'GEMINI_ERROR',
        severity: 'warning'
      });
    }
    
    let audioUrl = null;
    let audioDuration = 0;
    
    try {
      const request = {
        input: { text: commentaryText },
        voice: { 
          languageCode: 'en-US', 
          name: 'en-US-Neural2-J',
        },
        audioConfig: { 
          audioEncoding: 'MP3',
          speakingRate: 1.0
        },
      };

      const [response] = await ttsClient.synthesizeSpeech(request);

      const audioDir = path.join(__dirname, '../public/audio');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      const fileName = `commentary_${Date.now()}.mp3`;
      const filePath = path.join(audioDir, fileName);
      fs.writeFileSync(filePath, response.audioContent, 'binary');
      audioUrl = `/audio/${fileName}`;
      audioDuration = estimateAudioDuration(commentaryText);
    } catch (ttsError) {
      console.warn('⚠️ TTS failed, continuing without audio:', ttsError.message);
    }

    const commentary = await Commentary.create({
      matchId,
      eventType,
      commentaryText,
      audioUrl,
      audioDuration,
      eventData,
      priority: determinePriority(eventType),
      isAIGenerated,
    });

    console.log(`✅ Commentary generated: "${commentaryText}" ${isAIGenerated ? '(AI)' : '(Fallback)'}`);

    const broadcastData = {
      type: 'commentary',
      matchId: matchId.toString(),
      commentary: {
        id: commentary._id,
        text: commentaryText,
        audioUrl,
        audioDuration: commentary.audioDuration,
        eventType,
        isAIGenerated,
        hasAudio: !!audioUrl,
        createdAt: commentary.createdAt
      },
      eventData
    };

    broadcastToMatch(matchId.toString(), broadcastData);

    return commentary;

  } catch (error) {
    console.error('❌ Auto-generate commentary error:', error);
    
    broadcastToMatch(matchId.toString(), {
      type: 'error',
      message: 'Failed to generate commentary',
      errorCode: 'COMMENTARY_GENERATION_FAILED',
      severity: 'error'
    });
    
    return null;
  }
};

// ============================================
// EXPORT HELPER FUNCTIONS
// ============================================
exports.broadcastToMatch = broadcastToMatch;
exports.stopConnectionCleanup = stopConnectionCleanup;