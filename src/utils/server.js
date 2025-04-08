const config = require('../config/config');

/**
 * Start the server with automatic port fallback and graceful shutdown
 * @param {Express} app - The Express application
 * @returns {http.Server} The HTTP server instance
 */
exports.startServer = (app) => {
  const server = app.listen(config.PORT, () => {
    console.log(`Server running on http://localhost:${config.PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${config.PORT} is already in use, trying port ${config.ALTERNATIVE_PORT}...`);
      server.close();
      app.listen(config.ALTERNATIVE_PORT, () => {
        console.log(`Server running on http://localhost:${config.ALTERNATIVE_PORT}`);
      });
    } else {
      console.error('Server error:', err);
    }
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });

  return server;
};
