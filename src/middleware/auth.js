/**
 * Authentication middleware
 */

const User = require('../models/User');

/**
 * Ensures user is authenticated before accessing a route
 */
exports.ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
};

/**
 * Ensures user is an admin before accessing a route
 */
exports.ensureAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  
  res.status(403).render('error', {
    title: 'Access Denied',
    message: 'You do not have permission to access this page',
    error: {
      status: 403,
      stack: ''
    }
  });
};

/**
 * Sets the current user in res.locals for all templates
 */
exports.setCurrentUser = async (req, res, next) => {
  res.locals.user = null; // Always initialize to null
  
  if (req.session && req.session.user) {
    try {
      // Get fresh user data for every request
      const freshUser = await User.findById(req.session.user.id)
        .select('-password'); // Get all fields except password
      
      if (freshUser) {
        // Update session with the latest data
        req.session.user = {
          id: freshUser._id,
          username: freshUser.username,
          email: freshUser.email,
          role: freshUser.role,
          profileImage: freshUser.profileImage || null,
          bio: freshUser.bio || null
        };
        
        // Make user data available to all views
        res.locals.user = req.session.user;
        
        // Also add isAdmin and isAuthenticated convenience flags
        res.locals.isAuthenticated = true;
        res.locals.isAdmin = freshUser.role === 'admin';
      } else {
        // User no longer exists in database, clear session
        delete req.session.user;
      }
    } catch (err) {
      console.error('Error refreshing user data:', err);
      // Still use session data as fallback
      res.locals.user = req.session.user;
      res.locals.isAuthenticated = true;
      res.locals.isAdmin = req.session.user.role === 'admin';
    }
  }
  
  next();
};

/**
 * Redirects authenticated users away from login/register pages
 */
exports.redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/'); // Changed from '/guides' to homepage
  }
  next();
};