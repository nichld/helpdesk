const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureAuthenticated, redirectIfAuthenticated, ensureAdmin } = require('../middleware/auth');
const { profileUpload } = require('../utils/uploadConfig');

// Public routes
router.get('/login', redirectIfAuthenticated, authController.getLogin);
router.post('/login', redirectIfAuthenticated, authController.login);
router.get('/register', redirectIfAuthenticated, authController.getRegister);
router.post('/register', redirectIfAuthenticated, authController.register);
router.get('/logout', authController.logout);

// Protected routes
router.get('/profile', ensureAuthenticated, authController.profile);
router.post('/profile/update', ensureAuthenticated, authController.updateProfile);
router.post('/profile/upload-image', ensureAuthenticated, profileUpload.single('profileImage'), authController.uploadProfileImage);

// Admin routes
router.get('/users', ensureAuthenticated, ensureAdmin, authController.manageUsers);
router.post('/users/update-role', ensureAuthenticated, ensureAdmin, authController.updateUserRole);

module.exports = router;
