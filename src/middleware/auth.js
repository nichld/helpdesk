/**
 * Authentication middleware
 */

const User = require('../models/User');

/**
 * Middleware to ensure user is authenticated
 */
exports.ensureAuthenticated = (req, res, next) => {
  console.log('Auth check - Session:', req.session.user ? `User ${req.session.user.id} (${req.session.user.role})` : 'No user in session');
  
  if (req.session.user) {
    return next();
  } else {
    if (req.xhr || req.path.includes('/api/') || req.headers.accept.includes('application/json')) {
      return res.status(401).json({ 
        success: false,
        message: 'You need to be logged in to perform this action' 
      });
    }
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
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
 * Middleware to ensure user is an employee or admin
 */
exports.ensureEmployee = (req, res, next) => {
  console.log('Employee check - Role:', req.session.user ? req.session.user.role : 'No user');
  
  if (req.session.user && (req.session.user.role === 'employee' || req.session.user.role === 'admin')) {
    return next();
  } else {
    if (req.xhr || req.path.includes('/api/') || req.headers.accept.includes('application/json')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only employees can perform this action' 
      });
    }
    return res.render('error', {
      title: 'Access Denied',
      message: 'You do not have permission to access this page',
      error: { status: 403 }
    });
  }
};

/**
 * Ensures user has access to a specific ticket
 */
exports.ensureTicketAccess = async (req, res, next) => {
  try {
    const ticketService = require('../services/ticketService');
    const ticketId = req.params.id;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    console.log(`Ticket access check: User ${userId} (${userRole}) for ticket ${ticketId}`);
    
    // Employees and admins always have access
    if (userRole === 'employee' || userRole === 'admin') {
      console.log('Access granted: Employee or admin');
      return next();
    }
    
    // Get the ticket to check ownership
    const result = await ticketService.getTicketById(ticketId);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Check if user is the ticket owner
    const ticket = result.ticket;
    const isOwner = ticket.customer._id.toString() === userId;
    
    if (isOwner) {
      console.log('Access granted: Ticket owner');
      return next();
    }
    
    console.log('Access denied: Not ticket owner or staff');
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to access this ticket'
    });
  } catch (error) {
    console.error('Error in ensureTicketAccess:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while checking ticket access'
    });
  }
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
          firstName: freshUser.firstName,
          lastName: freshUser.lastName,
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
        res.locals.isEmployee = freshUser.role === 'employee' || freshUser.role === 'admin';
        res.locals.isCustomer = freshUser.role === 'customer';
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
      res.locals.isEmployee = req.session.user.role === 'employee' || req.session.user.role === 'admin';
      res.locals.isCustomer = req.session.user.role === 'customer';
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