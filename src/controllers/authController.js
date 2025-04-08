const authService = require('../services/authService');
const User = require('../models/User'); // Add User model import

/**
 * Renders login page
 */
exports.getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Login',  // Removed "- Drift Guides"
    error: null
  });
};

/**
 * Renders registration page
 */
exports.getRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Register',  // Removed "- Drift Guides"
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
        username: result.user.username,
        email: result.user.email,
        role: result.user.role,
        profileImage: result.user.profileImage // Add profileImage to session
      };
      
      // Check if there's a return URL saved in the session
      const returnTo = req.session.returnTo || '/profile';
      delete req.session.returnTo;
      
      return res.redirect(returnTo);
    }
    
    res.render('auth/login', {
      title: 'Login - Drift Guides',
      error: result.message,
      email
    });
  } catch (error) {
    res.render('auth/login', {
      title: 'Login - Drift Guides',
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
    const { username, email, password } = req.body;
    
    // Removed password confirmation check since the field was removed
    
    const result = await authService.registerUser(username, email, password);
    
    if (result.success) {
      req.session.user = {
        id: result.user._id,
        username: result.user.username,
        email: result.user.email,
        role: result.user.role,
        profileImage: result.user.profileImage
      };
      return res.redirect('/');
    }
    
    res.render('auth/register', {
      title: 'Register - Drift Guides',
      error: result.message,
      username,
      email
    });
  } catch (error) {
    res.render('auth/register', {
      title: 'Register - Drift Guides',
      error: 'An error occurred during registration.',
      username: req.body.username,
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
      title: 'Your Profile',  // Removed "- Drift Guides"
      user: user
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.render('auth/profile', {
      title: 'Your Profile',  // Removed "- Drift Guides"
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
    const { username, email, profileImage, bio, currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validate passwords match if changing password
    if (newPassword && newPassword !== confirmPassword) {
      return res.render('auth/profile', {
        title: 'Your Profile',  // Removed "- Drift Guides"
        user: await User.findById(req.session.user.id).select('-password'),
        error: 'New passwords do not match.'
      });
    }
    
    const result = await authService.updateUserProfile(
      req.session.user.id, 
      { username, email, profileImage, bio, newPassword },
      currentPassword
    );
    
    if (result.success) {
      // Update session with new user data including profile image
      req.session.user = {
        id: result.user._id,
        username: result.user.username,
        email: result.user.email,
        role: result.user.role,
        profileImage: result.user.profileImage
      };
      
      return res.render('auth/profile', {
        title: 'Your Profile',  // Removed "- Drift Guides"
        user: result.user,
        success: 'Profile updated successfully.'
      });
    }
    
    // If update failed
    const user = await User.findById(req.session.user.id).select('-password');
    res.render('auth/profile', {
      title: 'Your Profile',  // Removed "- Drift Guides"
      user: user,
      error: result.message
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    
    const user = await User.findById(req.session.user.id).select('-password');
    res.render('auth/profile', {
      title: 'Your Profile',  // Removed "- Drift Guides"
      user: user,
      error: 'An error occurred while updating your profile.'
    });
  }
};
