/**
 * Authentication middleware
 */

const User = require('../models/User');

/**
 * Middleware to ensure user is authenticated
 */
exports.ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
};

/**
 * Middleware to ensure user is authenticated and approved
 */
exports.ensureApproved = (req, res, next) => {
  if (req.session && req.session.user) {
    if (req.session.user.approved) {
      return next();
    } else {
      // User is authenticated but not approved
      return res.redirect('/pending-approval');
    }
  }
  
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
};

/**
 * Middleware to ensure user is an employee
 */
exports.ensureEmployee = (req, res, next) => {
  if (req.session && req.session.user) {
    // Check if user is approved first
    if (!req.session.user.approved) {
      return res.redirect('/pending-approval');
    }
    
    // Check if user is any type of employee or admin
    if (req.session.user.role.startsWith('employee_') || req.session.user.role === 'admin') {
      return next();
    }
  }
  
  res.status(403).render('error', {
    title: 'Access Denied',
    message: 'You do not have permission to access this resource',
    error: {
      status: 403
    }
  });
};

/**
 * Middleware to ensure user is an admin
 */
exports.ensureAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    // Admin is always approved
    return next();
  }
  
  res.status(403).render('error', {
    title: 'Access Denied',
    message: 'You need administrator privileges to access this resource',
    error: {
      status: 403
    }
  });
};

/**
 * Middleware to check specialization for employee routes
 * @param {string} specialization - Required specialization ('technical', 'billing', or 'general')
 */
exports.checkSpecialization = (specialization) => {
  return (req, res, next) => {
    if (req.session && req.session.user) {
      // Admins can access any specialization
      if (req.session.user.role === 'admin') {
        return next();
      }
      
      // Check if employee has the required specialization
      const requiredRole = `employee_${specialization}`;
      if (req.session.user.role === requiredRole) {
        return next();
      }
      
      // Employee with different specialization
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: `This area requires ${specialization} specialization`,
        error: { status: 403 }
      });
    }
    
    // Not logged in
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
  };
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
          bio: freshUser.bio || null,
          approved: freshUser.approved || false
        };
        
        // Make user data available to all views
        res.locals.user = req.session.user;
        
        // Also add isAdmin and isAuthenticated convenience flags
        res.locals.isAuthenticated = true;
        res.locals.isAdmin = freshUser.role === 'admin';
        res.locals.isEmployee = freshUser.role.startsWith('employee_') || freshUser.role === 'admin';
        res.locals.isCustomer = freshUser.role === 'customer';
        res.locals.isApproved = freshUser.approved || false;
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
      res.locals.isEmployee = req.session.user.role.startsWith('employee_') || req.session.user.role === 'admin';
      res.locals.isCustomer = req.session.user.role === 'customer';
      res.locals.isApproved = req.session.user.approved || false;
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