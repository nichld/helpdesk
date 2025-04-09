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

// Approval waiting page
router.get('/waiting-approval', (req, res) => {
  // Only allow access if user is logged in but not approved
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  if (req.session.user.approved) {
    return res.redirect('/');
  }
  
  res.render('auth/waiting-approval', {
    title: 'Waiting for Approval',
    user: req.session.user
  });
});

// Protected routes
router.get('/profile', ensureAuthenticated, authController.profile);
router.post('/profile/update', ensureAuthenticated, authController.updateProfile);
router.post('/profile/upload-image', ensureAuthenticated, profileUpload.single('profileImage'), authController.uploadProfileImage);

// Admin routes
router.get('/users', ensureAuthenticated, ensureAdmin, authController.manageUsers);
router.post('/users/update-role', ensureAuthenticated, ensureAdmin, authController.updateUserRole);
router.post('/users/update-approval', ensureAuthenticated, ensureAdmin, authController.updateUserApproval);
router.post('/users/delete', ensureAuthenticated, ensureAdmin, authController.deleteUser);

module.exports = router;
