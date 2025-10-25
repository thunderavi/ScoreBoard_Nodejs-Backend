require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // ⭐ ADD THIS
const cors = require('cors');
const connectDB = require('./config/database');
const { logger, errorHandler, notFound } = require('./middleware');

const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy (CRITICAL for Vercel/Heroku)
app.set('trust proxy', 1);

// CORS Configuration
const allowedOrigins = [
  'https://cricket-scoreboard-react.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('❌ CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ⭐ Session middleware WITH MongoDB store
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      touchAfter: 24 * 3600,
      crypto: {
        secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-this'
      }
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
    },
    name: 'cricket.sid'
  })
);

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Session: ${req.sessionID}, User: ${req.session.userId || 'none'}`);
  next();
});

// Request logger
app.use(logger);

// Serve static files
app.use(express.static('public'));

// Import routes
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const playerRoutes = require('./routes/playerRoutes');
const matchRoutes = require('./routes/matchRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({
    message: 'Cricket Scoreboard API is running!',
    version: '1.0.0',
    session: {
      id: req.sessionID,
      userId: req.session.userId || null,
      loggedIn: req.session.userLoggedIn || false
    },
    endpoints: {
      auth: '/api/auth',
      teams: '/api/teams',
      players: '/api/players',
      matches: '/api/matches'
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    session: {
      configured: !!req.session,
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
  
  res.json({
    success: true,
    message: 'Session working!',
    sessionID: req.sessionID,
    views: req.session.views,
    userId: req.session.userId || null,
    cookie: {
      secure: req.session.cookie.secure,
      httpOnly: req.session.cookie.httpOnly,
      sameSite: req.session.cookie.sameSite
    }
  });
});

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Session Store: MongoDB`);
  console.log(`🍪 Secure Cookies: ${process.env.NODE_ENV === 'production'}`);
  console.log('=================================');
});