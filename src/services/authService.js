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
    
    // Check if the user is approved
    if (!user.approved) {
      return { 
        success: false, 
        message: 'Your account is pending approval. You will be notified when an administrator approves your account.',
        pendingApproval: true,
        user
      };
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
    
    // Create the new user (default approved to false)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: 'customer',
      approved: false
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

    // First ensure there's an admin
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      // Create a default admin user
      await User.create({
        firstName: defaultFirstName,
        lastName: defaultLastName,
        email: `admin@${defaultDomain}`,
        password: defaultPassword,
        role: 'admin',
        approved: true
      });
      console.log(`Default admin user created: ${defaultFirstName} ${defaultLastName} (admin@${defaultDomain})`);
    }
    
    // Create default employee users for each specialization if they don't exist
    const employeeRoles = ['employee_technical', 'employee_billing', 'employee_general'];
    for (const role of employeeRoles) {
      const specialization = role.split('_')[1];
      const userExists = await User.findOne({ role });
      
      if (!userExists) {
        await User.create({
          firstName: defaultFirstName,
          lastName: defaultLastName,
          email: `${specialization}@${defaultDomain}`,
          password: defaultPassword,
          role: role,
          approved: true
        });
        console.log(`Default ${role} user created: ${defaultFirstName} ${defaultLastName} (${specialization}@${defaultDomain})`);
      }
    }
    
    // Create a default customer if none exists
    const customerExists = await User.findOne({ role: 'customer' });
    if (!customerExists) {
      await User.create({
        firstName: defaultFirstName,
        lastName: defaultLastName,
        email: `customer@${defaultDomain}`,
        password: defaultPassword,
        role: 'customer',
        approved: true
      });
      console.log(`Default customer user created: ${defaultFirstName} ${defaultLastName} (customer@${defaultDomain})`);
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
 * @param {string} role - New role
 * @param {string} currentUserId - ID of the admin performing the change
 * @returns {Object} Update result
 */
exports.updateUserRole = async (userId, role, currentUserId) => {
  try {
    const validRoles = ['customer', 'employee_technical', 'employee_billing', 'employee_general', 'admin'];
    
    if (!validRoles.includes(role)) {
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
    if (user.role === 'admin' && role !== 'admin') {
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

/**
 * Approve a user account
 * @param {string} userId - ID of user to approve
 * @param {string} currentUserId - ID of the admin performing the approval
 * @returns {Object} Approval result
 */
exports.approveUser = async (userId, currentUserId) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return { success: false, message: 'User not found.' };
    }
    
    // Check if current user is admin
    const adminUser = await User.findById(currentUserId);
    if (!adminUser || adminUser.role !== 'admin') {
      return { success: false, message: 'Only administrators can approve users.' };
    }
    
    // Set user as approved
    user.approved = true;
    await user.save();
    
    return {
      success: true,
      user: await User.findById(userId).select('-password')
    };
  } catch (error) {
    console.error('User approval error:', error);
    return { success: false, message: 'An error occurred while approving the user.' };
  }
};

/**
 * Get pending approval users
 * @returns {Object} List of users awaiting approval
 */
exports.getPendingApprovalUsers = async () => {
  try {
    const pendingUsers = await User.find({ approved: false }).select('-password').sort('createdAt');
    
    return {
      success: true,
      users: pendingUsers
    };
  } catch (error) {
    console.error('Error fetching pending users:', error);
    return { success: false, message: 'An error occurred while fetching pending users.' };
  }
};
