const mongoose = require('mongoose');
const config = require('../config/config');
const User = require('../models/User');

/**
 * Authenticates a user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Object} Authentication result with success status and user data or error message
 */
exports.authenticateUser = async (email, password) => {
  try {
    if (!email || !password) {
      return { success: false, message: 'Please provide both email and password.' };
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return { success: false, message: 'Invalid email or password.' };
    }
    
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return { success: false, message: 'Invalid email or password.' };
    }
    
    return { 
      success: true, 
      user
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, message: 'An error occurred during authentication.' };
  }
};

/**
 * Registers a new user
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Object} Registration result with success status and user data or error message
 */
exports.registerUser = async (firstName, lastName, email, password) => {
  try {
    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return { success: false, message: 'Please provide all required fields.' };
    }
    
    // Check if user with this email already exists
    let existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return { success: false, message: 'A user with this email already exists.' };
    }
    
    // Create the new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: 'customer' // Default role for new registrations
    });
    
    return { 
      success: true, 
      user
    };
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return { success: false, message: messages[0] };
    }
    return { success: false, message: 'An error occurred during registration.' };
  }
};

/**
 * Creates default users if they don't exist (admin, employee, customer)
 * @returns {Promise<void>}
 */
exports.createAdminIfNotExists = async () => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB not connected yet, waiting to create default users...');
      return;
    }

    const defaultFirstName = config.DEFAULT_FIRST_NAME;
    const defaultLastName = config.DEFAULT_LAST_NAME;
    const defaultDomain = config.DEFAULT_DOMAIN;
    const defaultPassword = config.DEFAULT_PASSWORD;

    // Check for each role type and create if it doesn't exist
    const roles = ['admin', 'employee', 'customer'];
    
    for (const role of roles) {
      const userExists = await User.findOne({ role });
      
      if (!userExists) {
        // Create a default user for this role
        await User.create({
          firstName: defaultFirstName,
          lastName: defaultLastName,
          email: `${role}@${defaultDomain}`,
          password: defaultPassword,
          role: role
        });
        console.log(`Default ${role} user created: ${defaultFirstName} ${defaultLastName} (${role}@${defaultDomain})`);
      }
    }
  } catch (error) {
    console.error('Error creating default users:', error);
  }
};

/**
 * Updates a user's profile information
 * @param {string} userId - User's ID
 * @param {Object} updateData - Data to update (firstName, lastName, email, profileImage, bio, newPassword)
 * @param {string} currentPassword - Current password for verification
 * @returns {Object} Update result with success status and user data or error message
 */
exports.updateUserProfile = async (userId, updateData, currentPassword) => {
  try {
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return { success: false, message: 'User not found.' };
    }
    
    // Verify current password
    const isPasswordValid = await user.matchPassword(currentPassword);
    
    if (!isPasswordValid) {
      return { success: false, message: 'Current password is incorrect.' };
    }
    
    // Check if email is taken by another user
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ email: updateData.email });
      if (existingUser && existingUser._id.toString() !== userId) {
        return { success: false, message: 'This email is already in use.' };
      }
    }
    
    // Prepare update object
    const updateObj = {
      firstName: updateData.firstName || user.firstName,
      lastName: updateData.lastName || user.lastName,
      email: updateData.email || user.email,
      profileImage: updateData.profileImage,
      bio: updateData.bio
    };
    
    // Update password if provided
    if (updateData.newPassword) {
      // Password will be hashed by the pre-save middleware
      user.password = updateData.newPassword;
      await user.save();
      
      // Update other fields
      await User.findByIdAndUpdate(userId, updateObj);
    } else {
      // Just update profile info without changing password
      await User.findByIdAndUpdate(userId, updateObj);
    }
    
    // Get updated user
    const updatedUser = await User.findById(userId).select('-password');
    
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error('Profile update error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return { success: false, message: messages[0] };
    }
    return { success: false, message: 'An error occurred during profile update.' };
  }
};

/**
 * Updates a user's role (admin only)
 * @param {string} userId - ID of user to update
 * @param {string} role - New role ('customer', 'employee', or 'admin')
 * @param {string} currentUserId - ID of the admin performing the change
 * @returns {Object} Update result
 */
exports.updateUserRole = async (userId, role, currentUserId) => {
  try {
    if (!['customer', 'employee', 'admin'].includes(role)) {
      return { success: false, message: 'Invalid role.' };
    }
    
    // Prevent admins from changing their own role
    if (userId === currentUserId) {
      return { success: false, message: 'You cannot change your own role.' };
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return { success: false, message: 'User not found.' };
    }
    
    // Prevent changing role of other admin users
    if (user.role === 'admin') {
      return { success: false, message: 'Admin roles cannot be modified for security reasons.' };
    }
    
    user.role = role;
    await user.save();
    
    return {
      success: true,
      user: await User.findById(userId).select('-password')
    };
  } catch (error) {
    console.error('Role update error:', error);
    return { success: false, message: 'An error occurred while updating the role.' };
  }
};
