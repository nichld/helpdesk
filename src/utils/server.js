/**
 * Starts the Express server
 * @param {http.Server|Express} server - The HTTP server or Express app
 */
exports.startServer = (server) => {
  const port = process.env.PORT || process.env.ALTERNATIVE_PORT || 3000;
  
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Access the application at http://localhost:${port}`);
  });
};
