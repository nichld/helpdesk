const session = require('express-session');
const MongoStore = require('connect-mongo');
const config = require('./config');

/**
 * Configure session middleware with MongoDB store
 * @returns {Function} Configured session middleware
 */
exports.configureSession = () => {
  return session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: config.mongoURI,
      collectionName: 'sessions'
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  });
};
