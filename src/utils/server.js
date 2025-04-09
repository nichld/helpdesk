/**
 * Starts the Express server
 * @param {http.Server|Express} server - The HTTP server or Express app
 */
exports.startServer = (server) => {
  const port = process.env.PORT || process.env.ALTERNATIVE_PORT || 3000;
  
  const httpServer = server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log(`Access the application at http://localhost:${port}`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    httpServer.close(() => {
      console.log('HTTP server closed');
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
  
  return httpServer;
};
