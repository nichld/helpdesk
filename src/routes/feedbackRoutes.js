const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { ensureAuthenticated, ensureAdmin, ensureEmployee } = require('../middleware/auth');
const feedbackService = require('../services/feedbackService');

// Ticket feedback submission - keep these as they're needed for the "Thank you for your feedback" flow
router.get('/tickets/:id/feedback', ensureAuthenticated, feedbackController.renderFeedbackForm);
router.post('/tickets/:id/feedback', ensureAuthenticated, feedbackController.submitFeedback);
router.get('/tickets/:id/feedback/check', ensureAuthenticated, async (req, res) => {
  const result = await feedbackService.getTicketFeedback(req.params.id);
  return res.json({ success: true, hasFeedback: !!result.feedback });
});

// Employee & Admin feedback routes
router.get('/admin/feedback', ensureAuthenticated, ensureEmployee, feedbackController.adminFeedback);
router.get('/admin/feedback/:id', ensureAuthenticated, ensureEmployee, feedbackController.viewFeedbackDetails);

// Admin-only actions
router.post('/admin/feedback/delete', ensureAuthenticated, ensureAdmin, feedbackController.deleteFeedback);

module.exports = router;
