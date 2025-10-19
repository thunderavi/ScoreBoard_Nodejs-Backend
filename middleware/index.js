const { requireAuth, optionalAuth, redirectIfAuthenticated } = require('./auth');
const { errorHandler, notFound } = require('./errorHandler');
const logger = require('./logger');

module.exports = {
  requireAuth,
  optionalAuth,
  redirectIfAuthenticated,
  errorHandler,
  notFound,
  logger
};