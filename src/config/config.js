const dotenv = require('dotenv');
dotenv.config();

/**
 * Application configuration with environment variable support
 * All environment variables from .env file are mapped here with fallbacks
 */
const config = {
  // Server configuration
  PORT: parseInt(process.env.PORT || '3000', 10),
  ALTERNATIVE_PORT: parseInt(process.env.ALTERNATIVE_PORT || '3005', 10),
  
  // Database configuration
  mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ejs-template',
  
  // Authentication
  SESSION_SECRET: process.env.SESSION_SECRET || 'ejs-template-secret-key',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'changeme',
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
};

module.exports = config;