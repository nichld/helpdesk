const authService = require('../services/authService');
const User = require('../models/User');

/**
 * Renders login page
 */
exports.getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    error: null
  });
};

/**
 * Renders registration page
 */
exports.getRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Register',
    error: null
  });
};

/**
 * Handles user login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await authService.authenticateUser(email, password);
    
    if (result.success) {
      req.session.user = {
        id: result.user._id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        role: result.user.role,
        profileImage: result.user.profileImage
      };
      
      // Check if there's a return URL saved in the session
      const returnTo = req.session.returnTo || '/profile';
      delete req.session.returnTo;
      
      return res.redirect(returnTo);
    }
    
    res.render('auth/login', {
      title: 'Login',
      error: result.message,
      email
    });
  } catch (error) {
    res.render('auth/login', {
      title: 'Login',
      error: 'An error occurred during login.',
      email: req.body.email
    });
  }
};

/**
 * Handles user registration
 */
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    const result = await authService.registerUser(firstName, lastName, email, password);
    
    if (result.success) {
      req.session.user = {
        id: result.user._id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        role: result.user.role,
        profileImage: result.user.profileImage
      };
      return res.redirect('/');
    }
    
    res.render('auth/register', {
      title: 'Register',
      error: result.message,
      firstName,
      lastName,
      email
    });
  } catch (error) {
    res.render('auth/register', {
      title: 'Register',
      error: 'An error occurred during registration.',
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email
    });
  }
};

/**
 * Handles user logout
 */
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
};

/**
 * Renders profile page
 */
exports.profile = async (req, res) => {
  try {
    // Get full user data from database
    const user = await User.findById(req.session.user.id).select('-password');
    
    res.render('auth/profile', {
      title: 'Your Profile',
      user: user
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.render('auth/profile', {
      title: 'Your Profile',
      user: req.session.user,
      error: 'Failed to load complete profile data.'
    });
  }
};

/**
 * Handles user profile update
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, profileImage, bio, currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validate passwords match if changing password
    if (newPassword && newPassword !== confirmPassword) {
      return res.render('auth/profile', {
        title: 'Your Profile',
        user: await User.findById(req.session.user.id).select('-password'),
        error: 'New passwords do not match.'
      });
    }
    
    const result = await authService.updateUserProfile(
      req.session.user.id, 
      { firstName, lastName, email, profileImage, bio, newPassword },
      currentPassword
    );
    
    if (result.success) {
      // Update session with new user data including profile image
      req.session.user = {
        id: result.user._id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        role: result.user.role,
        profileImage: result.user.profileImage
      };
      
      return res.render('auth/profile', {
        title: 'Your Profile',
        user: result.user,
        success: 'Profile updated successfully.'
      });
    }
    
    // If update failed
    const user = await User.findById(req.session.user.id).select('-password');
    res.render('auth/profile', {
      title: 'Your Profile',
      user: user,
      error: result.message
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    
    const user = await User.findById(req.session.user.id).select('-password');
    res.render('auth/profile', {
      title: 'Your Profile',
      user: user,
      error: 'An error occurred while updating your profile.'
    });
  }
};

/**
 * Renders user management page for admins
 */
exports.manageUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('lastName firstName');
    
    res.render('auth/users', {
      title: 'User Management',
      users: users
    });
  } catch (error) {
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load users',
      error: {
        status: 500,
        stack: process.env.NODE_ENV === 'production' ? '' : error.stack
      }
    });
  }
};

/**
 * Updates a user's role (admin only)
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const currentUserId = req.session.user.id; // Get the current admin's ID
    
    if (!['customer', 'employee', 'admin'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role specified' 
      });
    }
    
    const result = await authService.updateUserRole(userId, role, currentUserId);
    
    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        user: result.user 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: result.message 
      });
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while updating user role' 
    });
  }
};
