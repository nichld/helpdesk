const connectDB = require('./connectdb');
const authService = require('../services/authService');

/**
 * Initialize database connection and setup
 */
exports.initializeDatabase = async () => {
  try {
    const connection = await connectDB();
    await authService.createAdminIfNotExists();
    
    console.log('Database initialized');
    
    return connection;
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
};
