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
 * @param {string} username - User's username
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Object} Registration result with success status and user data or error message
 */
exports.registerUser = async (username, email, password) => {
  try {
    // Validate input
    if (!username || !email || !password) {
      return { success: false, message: 'Please provide all required fields.' };
    }
    
    // Check if user with this email already exists
    let existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return { success: false, message: 'A user with this email already exists.' };
    }
    
    // Check if username is taken
    existingUser = await User.findOne({ username });
    
    if (existingUser) {
      return { success: false, message: 'This username is already taken.' };
    }
    
    // Create the new user
    const user = await User.create({
      username,
      email,
      password
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
 * Creates an admin user if none exists
 * @returns {Promise<void>}
 */
exports.createAdminIfNotExists = async () => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB not connected yet, waiting to create admin...');
      return;
    }

    // Check if any admin user exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      // Create a default admin user
      await User.create({
        username: 'admin',
        email: config.ADMIN_EMAIL,
        password: config.ADMIN_PASSWORD,
        role: 'admin'
      });
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

/**
 * Updates a user's profile information
 * @param {string} userId - User's ID
 * @param {Object} updateData - Data to update
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
    
    // Check if username is taken by another user
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await User.findOne({ username: updateData.username });
      if (existingUser && existingUser._id.toString() !== userId) {
        return { success: false, message: 'This username is already taken.' };
      }
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
      username: updateData.username || user.username,
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
