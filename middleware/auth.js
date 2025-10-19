// Authentication middleware - replaces auth_check.php

const requireAuth = (req, res, next) => {
  // Check if user is logged in (session exists)
  if (req.session && req.session.userId) {
    // User is authenticated, continue to next middleware/route
    return next();
  }

  // User is not authenticated
  // Store the attempted URL for redirect after login
  req.session.redirectAfterLogin = req.originalUrl;

  // For API requests (AJAX), return JSON
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login.',
      redirect: '/api/auth/login'
    });
  }

  // For page requests, redirect to login
  return res.redirect('/signup');
};

// Optional authentication - doesn't block access but adds user info if logged in
const optionalAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    req.isAuthenticated = true;
  } else {
    req.isAuthenticated = false;
  }
  next();
};

// Check if user is already logged in (for login/signup pages)
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    // User is already logged in, redirect to dashboard
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = {
  requireAuth,
  optionalAuth,
  redirectIfAuthenticated
};