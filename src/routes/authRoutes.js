const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureAuthenticated, ensureAdmin, ensureApproved } = require('../middleware/auth');
const { profileUpload } = require('../utils/uploadConfig');

// Authentication routes
router.get('/login', authController.getLogin);
router.post('/login', authController.login);
router.get('/register', authController.getRegister);
router.post('/register', authController.register);
router.post('/logout', authController.logout);

// Account approval routes
router.get('/pending-approval', authController.pendingApproval);
router.get('/check-approval', ensureAuthenticated, (req, res) => {
  res.json({ approved: req.session.user.approved });
});

// Profile routes (require approval)
router.get('/profile', ensureAuthenticated, ensureApproved, authController.profile);
router.post('/profile', ensureAuthenticated, ensureApproved, authController.updateProfile);
router.post('/profile/image', 
  ensureAuthenticated,
  ensureApproved,
  profileUpload.single('image'),
  authController.uploadProfileImage
);

// Admin routes
router.get('/admin/users', ensureAuthenticated, ensureAdmin, authController.manageUsers);
router.post('/admin/users/update-role', ensureAuthenticated, ensureAdmin, authController.updateUserRole);
router.post('/admin/users/approve', ensureAuthenticated, ensureAdmin, authController.approveUser);

module.exports = router;
