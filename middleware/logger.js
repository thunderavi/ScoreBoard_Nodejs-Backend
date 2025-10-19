// Request logger middleware

const logger = (req, res, next) => {
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;
    
    // Color code based on status
    if (res.statusCode >= 500) {
      console.error('\x1b[31m%s\x1b[0m', logMessage); // Red for 5xx errors
    } else if (res.statusCode >= 400) {
      console.warn('\x1b[33m%s\x1b[0m', logMessage); // Yellow for 4xx errors
    } else if (res.statusCode >= 300) {
      console.log('\x1b[36m%s\x1b[0m', logMessage); // Cyan for 3xx redirects
    } else {
      console.log('\x1b[32m%s\x1b[0m', logMessage); // Green for 2xx success
    }
  });
  
  next();
};

module.exports = logger;