const authService = require('../services/authService');
const User = require('../models/User');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

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
        approved: result.user.approved,
        profileImage: result.user.profileImage
      };
      
      // If customer needs approval, redirect to waiting page
      if (result.requiresApproval) {
        return res.redirect('/waiting-approval');
      }
      
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
 * Renders waiting for approval page
 */
exports.waitingApproval = (req, res) => {
  // If user is not logged in or is already approved, redirect
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  if (req.session.user.role !== 'customer' || req.session.user.approved) {
    return res.redirect('/');
  }
  
  res.render('auth/waiting-approval', {
    title: 'Account Pending Approval'
  });
};

/**
 * Handles user registration
 */
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    // Debug information
    console.log('Registration attempt with data:', {
      firstName: firstName || '[empty]',
      lastName: lastName || '[empty]',
      email: email || '[empty]', 
      password: password ? '[provided]' : '[empty]'
    });
    
    // Check if all fields are provided - FIX: more precise validation
    if (!firstName || !lastName || !email || !password) {
      const missingFields = [];
      if (!firstName) missingFields.push('First Name');
      if (!lastName) missingFields.push('Last Name');
      if (!email) missingFields.push('Email');
      if (!password) missingFields.push('Password');
      
      return res.render('auth/register', {
        title: 'Register',
        error: `Missing required fields: ${missingFields.join(', ')}`,
        formData: { firstName, lastName, email }
      });
    }
    
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render('auth/register', {
        title: 'Register',
        error: 'Please enter a valid email address',
        formData: { firstName, lastName, email }
      });
    }

    // Register the user through the auth service - FIXED: using registerUser instead of register
    const result = await authService.registerUser(firstName, lastName, email, password);

    if (!result.success) {
      return res.render('auth/register', {
        title: 'Register',
        error: result.message,
        form: { firstName, lastName, email }
      });
    }

    // Set session data (but mark as not approved if user is a customer)
    req.session.user = {
      id: result.user._id,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
      role: result.user.role,
      approved: result.user.approved
    };

    // Redirect to waiting approval page for customers, or dashboard for employees
    if (result.user.role === 'customer' && !result.user.approved) {
      return res.redirect('/waiting-approval');
    } else {
      return res.redirect('/');
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.render('auth/register', {
      title: 'Register',
      error: 'An error occurred during registration. Please try again.',
      formData: req.body
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
    const { firstName, lastName, email, profileImage, bio, currentPassword, newPassword } = req.body;
    
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
 * Handles profile image uploads
 */
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file was provided'
      });
    }

    console.log('Uploaded file info:', req.file);
    console.log('Original filename:', req.file.originalname);
    console.log('Detected MIME type:', req.file.mimetype);
    
    const mimeType = req.file.mimetype;
    const pathToSave = path.join(__dirname, '../../uploads/profiles');
    const filenameBase = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const pngFilename = `${filenameBase}.png`;
    const pngPath = path.join(pathToSave, pngFilename);

    let fileUrl;

    const originalName = req.file.originalname || '';
    const isHEIC = mimeType === 'image/heic' || mimeType === 'image/heif' || originalName.toLowerCase().endsWith('.heic');

    if (isHEIC) {
      console.log('Detected HEIC image, attempting conversion to PNG...');
      const debugRawPath = path.join(pathToSave, `${filenameBase}-raw.heic`);
      fs.writeFileSync(debugRawPath, req.file.buffer);
      console.log('Saved raw HEIC buffer to:', debugRawPath);

      try {
        await sharp(req.file.buffer)
          .png({ quality: 90 })
          .toFile(pngPath);

        fileUrl = `/uploads/profiles/${pngFilename}`;
      } catch (sharpError) {
        console.error('HEIC to PNG conversion failed:', sharpError);
        return res.status(500).json({
          success: false,
          message: 'Failed to convert HEIC image'
        });
      }
    } else {
      try {
        fileUrl = `/uploads/profiles/${path.basename(req.file.path || '')}`;
      } catch (err) {
        console.error('Failed to extract file path:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to process uploaded image path'
        });
      }
    }

    // Update user with new profile image
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Save the file URL to the user's profile
    user.profileImage = fileUrl;
    await user.save();
    
    // Update session
    req.session.user.profileImage = fileUrl;
    
    res.status(200).json({
      success: true,
      profileImage: fileUrl
    });
  } catch (error) {
    console.error('Error uploading profile image:', error.stack || error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image'
    });
  }
};

/**
 * Renders user management page for admins
 */
exports.manageUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    
    // Build query object for filtering
    let query = {};
    
    // Apply search filter (looks for matches in firstName, lastName, or email)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }
    
    // Apply role filter
    if (role && role !== 'all') {
      query.role = role;
    }
    
    // Apply status filter (only for customers)
    if (status && status !== 'all') {
      if (role === 'all' || role === 'customer') {
        // If filtering specifically for customer role or all roles
        if (status === 'approved') {
          query.approved = true;
          // Ensure we're only looking at customers when filtering by approval status
          if (role === 'all') query.role = 'customer';
        } else if (status === 'pending') {
          query.approved = false;
          // Ensure we're only looking at customers when filtering by approval status
          if (role === 'all') query.role = 'customer';
        }
      }
    }
    
    // Get filtered users
    const users = await User.find(query).sort('firstName');
    
    res.render('auth/users', {
      title: 'User Management',
      users,
      filters: {
        search: search || '',
        role: role || 'all',
        status: status || 'all'
      },
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.render('auth/users', {
      title: 'User Management',
      users: [],
      filters: {
        search: '',
        role: 'all',
        status: 'all'
      },
      error: 'Failed to load users.'
    });
  }
};

/**
 * Updates a user's role (admin only)
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    if (!userId || !role) {
      return res.render('auth/users', {
        title: 'User Management',
        error: 'User ID and role are required',
        users: await User.find().sort('firstName')
      });
    }
    
    const result = await authService.updateUserRole(userId, role, req.session.user.id);
    
    if (result.success) {
      return res.redirect('/users?success=Role updated successfully');
    } else {
      return res.render('auth/users', {
        title: 'User Management',
        error: result.message,
        users: await User.find().sort('firstName')
      });
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    res.render('auth/users', {
      title: 'User Management',
      error: 'An error occurred while updating the user role',
      users: await User.find().sort('firstName')
    });
  }
};

/**
 * Updates a user's approval status (admin only)
 */
exports.updateUserApproval = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.render('auth/users', {
        title: 'User Management',
        error: 'User ID is required',
        users: await User.find().sort('firstName')
      });
    }
    
    const result = await authService.updateUserApproval(userId);
    
    if (result.success) {
      return res.redirect('/users?success=User approval status updated');
    } else {
      return res.render('auth/users', {
        title: 'User Management',
        error: result.message,
        users: await User.find().sort('firstName')
      });
    }
  } catch (error) {
    console.error('Error updating user approval:', error);
    res.render('auth/users', {
      title: 'User Management',
      error: 'An error occurred while updating user approval status',
      users: await User.find().sort('firstName')
    });
  }
};

/**
 * Deletes a user (admin only)
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.render('auth/users', {
        title: 'User Management',
        error: 'User ID is required',
        users: await User.find().sort('firstName')
      });
    }

    const result = await authService.deleteUser(userId, req.session.user.id);
    
    if (result.success) {
      return res.redirect('/users?success=' + encodeURIComponent(result.message));
    } else {
      return res.render('auth/users', {
        title: 'User Management',
        error: result.message,
        users: await User.find().sort('firstName')
      });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.render('auth/users', {
      title: 'User Management',
      error: 'An error occurred while deleting the user',
      users: await User.find().sort('firstName')
    });
  }
};
