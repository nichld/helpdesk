const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const router = require('./routes/router');
const { configureExpress } = require('./config/express');
const { configureSession } = require('./config/session');
const { initializeDatabase } = require('./utils/database');
const { startServer } = require('./utils/server');
const { setCurrentUser } = require('./middleware/auth');
const { initializeSocket } = require('./config/socket');

dotenv.config();

// Initialize Express
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO (must be done after creating HTTP server but before routes)
initializeSocket(server);

initializeDatabase().catch(err => {
  console.error('Database initialization failed, but continuing app startup');
});

configureExpress(app);

app.use(configureSession());

// Apply the attachUser middleware AFTER session middleware but BEFORE routes
app.use(setCurrentUser);

// Use the router which includes all routes and error handling
app.use("/", router);

// Start server with our HTTP server instance
startServer(server);

module.exports = app;