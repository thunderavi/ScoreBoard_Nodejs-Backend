require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const connectDB = require('./config/database');
const { logger, errorHandler, notFound } = require('./middleware');
const { allowedOrigins } = require('./config/cors'); // ✅ Import from config

const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy (CRITICAL for production deployment)
app.set('trust proxy', 1);

// Environment check
const isDevelopment = process.env.NODE_ENV !== 'production';
const isProduction = process.env.NODE_ENV === 'production';

console.log('=================================');
console.log('🔧 Environment Configuration');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Is Development: ${isDevelopment}`);
console.log(`   Is Production: ${isProduction}`);
console.log('=================================');

// ✅ CORS Configuration - Using centralized config
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('⚠️  CORS Warning - Origin not in allowed list:', origin);
      // In development, allow all origins
      if (isDevelopment) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// SESSION CONFIGURATION
// ============================================
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'cricket-scoreboard-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600,
    crypto: {
      secret: process.env.SESSION_SECRET || 'cricket-scoreboard-secret-key-change-in-production'
    },
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60
  }),
  cookie: {
    secure: !isDevelopment,
    httpOnly: true,
    sameSite: isDevelopment ? 'lax' : 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    domain: undefined,
    path: '/'
  },
  name: 'cricket.sid',
  rolling: true,
  proxy: true
};

app.use(session(sessionConfig));

// Log session configuration
console.log('=================================');
console.log('🍪 Session Cookie Configuration:');
console.log(`   Secure: ${sessionConfig.cookie.secure}`);
console.log(`   SameSite: ${sessionConfig.cookie.sameSite}`);
console.log(`   HttpOnly: ${sessionConfig.cookie.httpOnly}`);
console.log(`   Max Age: ${sessionConfig.cookie.maxAge / 1000 / 60 / 60 / 24} days`);
console.log(`   Store: MongoDB`);
console.log('=================================');

// ============================================
// DEBUG MIDDLEWARE
// ============================================
app.use((req, res, next) => {
  const sessionId = req.sessionID ? req.sessionID.substring(0, 8) + '...' : 'none';
  const userId = req.session?.userId ? req.session.userId.toString().substring(0, 8) + '...' : 'none';
  
  console.log(`${req.method} ${req.path} - Session: ${sessionId}, User: ${userId}`);
  
  if (req.path.includes('/auth/')) {
    console.log('   📋 Full Session:', {
      sessionID: req.sessionID,
      userId: req.session?.userId,
      userName: req.session?.userName,
      userEmail: req.session?.userEmail,
      loggedIn: req.session?.userLoggedIn,
      cookie: req.session?.cookie
    });
  }
  
  next();
});

// Request logger
app.use(logger);

// Serve static files
app.use(express.static('public'));

// ============================================
// IMPORT ROUTES
// ============================================
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const playerRoutes = require('./routes/playerRoutes');
const matchRoutes = require('./routes/matchRoutes');
const commentaryRoutes = require('./routes/commentaryRoutes');

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/commentary', commentaryRoutes);

// ============================================
// TEST ROUTES
// ============================================

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Cricket Scoreboard API is running!',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    session: {
      id: req.sessionID ? req.sessionID.substring(0, 20) + '...' : null,
      userId: req.session?.userId || null,
      loggedIn: req.session?.userLoggedIn || false,
      configured: !!req.session
    },
    endpoints: {
      auth: '/api/auth',
      teams: '/api/teams',
      players: '/api/players',
      matches: '/api/matches',
      commentary: '/api/commentary'
    },
    testing: {
      sessionTest: '/api/test-session',
      health: '/health'
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected',
    session: {
      configured: !!req.session,
      store: 'MongoDB',
      userId: req.session?.userId || null
    }
  });
});

// Session test endpoint
app.get('/api/test-session', (req, res) => {
  if (!req.session.views) {
    req.session.views = 0;
  }
  req.session.views++;
  
  req.session.testData = {
    timestamp: new Date().toISOString(),
    message: 'Session is working!'
  };
  
  res.json({
    success: true,
    message: 'Session working correctly!',
    sessionInfo: {
      sessionID: req.sessionID,
      views: req.session.views,
      testData: req.session.testData,
      userId: req.session.userId || null,
      userName: req.session.userName || null,
      userEmail: req.session.userEmail || null,
      loggedIn: req.session.userLoggedIn || false
    },
    cookieSettings: {
      secure: req.session.cookie.secure,
      httpOnly: req.session.cookie.httpOnly,
      sameSite: req.session.cookie.sameSite,
      maxAge: req.session.cookie.maxAge
    },
    instructions: 'Refresh this page multiple times. The "views" count should increase each time.'
  });
});

// Debug route
app.get('/api/debug/me', (req, res) => {
  res.json({
    session: {
      exists: !!req.session,
      sessionID: req.sessionID,
      userId: req.session?.userId || null,
      userName: req.session?.userName || null,
      userEmail: req.session?.userEmail || null,
      loggedIn: req.session?.userLoggedIn || false,
      cookie: req.session?.cookie
    },
    headers: {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer
    }
  });
});

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('=================================');
  console.log('✅ SERVER STARTED SUCCESSFULLY');
  console.log('=================================');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Session Store: MongoDB`);
  console.log(`🍪 Secure Cookies: ${isProduction}`);
  console.log(`🌐 CORS: Enabled for ${allowedOrigins.length} origins`);
  console.log('=================================');
  console.log('📝 Test Endpoints:');
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Session Test: http://localhost:${PORT}/api/test-session`);
  console.log(`   Debug: http://localhost:${PORT}/api/debug/me`);
  console.log('=================================');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});
// ... existing code ...

// ============================================
// START SERVER
// ============================================


// ✅ Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} signal received: starting graceful shutdown`);
  
  // Stop accepting new connections
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Stop connection cleanup
    const { stopConnectionCleanup } = require('./controllers/commentaryController');
    stopConnectionCleanup();
    
    // Close database connection
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});