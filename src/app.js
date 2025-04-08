const express = require('express');
const dotenv = require('dotenv');
const router = require('./routes/router');
const { configureExpress } = require('./config/express');
const { configureSession } = require('./config/session');
const { initializeDatabase } = require('./utils/database');
const { startServer } = require('./utils/server');
const { setCurrentUser } = require('./middleware/auth');

dotenv.config();

const app = express();

initializeDatabase().catch(err => {
  console.error('Database initialization failed, but continuing app startup');
});

configureExpress(app);

app.use(configureSession());

// Apply the attachUser middleware AFTER session middleware but BEFORE routes
app.use(setCurrentUser);

// Use the router which includes all routes and error handling
app.use("/", router);

startServer(app);

module.exports = app;