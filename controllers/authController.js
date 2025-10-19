const { User } = require('../models');

// @desc    Register new user (Sign Up)
// @route   POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if email matches @gmail.com
    if (!email.match(/@gmail\.com$/)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Gmail address'
      });
    }

    // Check password strength
    if (!password.match(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8+ characters with letters & numbers'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Create new user (password will be hashed by pre-save hook)
    const user = await User.create({
      name,
      email,
      password
    });

    // Create session
    req.session.userId = user._id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.userLoggedIn = true;

    // Save session and respond
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
      
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating account'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if email matches @gmail.com
    if (!email.match(/@gmail\.com$/)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Gmail address'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Create session
    req.session.userId = user._id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.userLoggedIn = true;

    // Save session and respond
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
      
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error logging in'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          success: false,
          message: 'Error logging out'
        });
      }

      res.clearCookie('connect.sid'); // Clear session cookie
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
};

// @desc    Get current user session info
// @route   GET /api/auth/me
const getCurrentUser = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
        isLoggedIn: false
      });
    }

    const user = await User.findById(req.session.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        isLoggedIn: false
      });
    }

    res.json({
      success: true,
      isLoggedIn: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
};

// @desc    Check authentication status
// @route   GET /api/auth/check
const checkAuth = (req, res) => {
  res.json({
    isLoggedIn: req.session.userLoggedIn || false,
    user: req.session.userId ? {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail
    } : null
  });
};

module.exports = {
  signup,
  login,
  logout,
  getCurrentUser,
  checkAuth
};