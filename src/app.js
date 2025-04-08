const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const router = require('./routes/router');
const { configureExpress } = require('./config/express');
const { configureSession } = require('./config/session');
const { initializeDatabase } = require('./utils/database');
const { startServer } = require('./utils/server');
const { initializeSocket } = require('./config/socket');

dotenv.config();

// Initialize Express
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Configure express with all middleware including session
configureExpress(app, { configureSession });

// Initialize Socket.IO (must be done after session configuration)
try {
  console.log('Initializing Socket.io...');
  initializeSocket(server);
  console.log('Socket.io initialized successfully');
} catch (error) {
  console.error('Error initializing Socket.io:', error);
  // Continue app startup even if socket initialization fails
}

initializeDatabase().catch(err => {
  console.error('Database initialization failed, but continuing app startup');
});

// Use the router which includes all routes and error handling
app.use("/", router);

// Start server with our HTTP server instance
startServer(server);

module.exports = app;