const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const feedbackController = require('../controllers/feedbackController');
const feedbackService = require('../services/feedbackService');
const { ensureAuthenticated, ensureEmployee, ensureAdmin } = require('../middleware/auth');
const { ticketUpload } = require('../utils/uploadConfig');

// Customer routes
router.get('/tickets', ensureAuthenticated, ticketController.customerTickets);
router.get('/tickets/create', ensureAuthenticated, ticketController.createTicketView);
router.post('/tickets/create', ensureAuthenticated, ticketController.createTicket);
router.get('/tickets/:id', ensureAuthenticated, ticketController.customerTicketDetail);
router.get('/tickets/:id/messages', ensureAuthenticated, ticketController.ticketMessages);
router.post('/tickets/:id/message', 
  ensureAuthenticated,  
  ticketUpload.single('image'), 
  ticketController.addMessage
);

// Feedback routes
router.get('/tickets/:id/feedback', ensureAuthenticated, feedbackController.renderFeedbackForm);
router.post('/tickets/:id/feedback', ensureAuthenticated, feedbackController.submitFeedback);
router.get('/tickets/:id/feedback/check', ensureAuthenticated, async (req, res) => {
  const result = await feedbackService.getTicketFeedback(req.params.id);
  return res.json({ success: true, hasFeedback: !!result.feedback });
});

// Customer feedback access
router.get('/feedback', ensureAuthenticated, feedbackController.customerFeedbackList);
router.get('/feedback/:id', ensureAuthenticated, feedbackController.viewFeedbackDetails);

// Employee routes
router.get('/admin/dashboard', ensureAuthenticated, ensureEmployee, ticketController.employeeDashboard);
router.get('/admin/tickets', ensureAuthenticated, ensureEmployee, ticketController.employeeTickets);
router.get('/admin/tickets/assigned', ensureAuthenticated, ensureEmployee, ticketController.employeeAssignedTickets);
router.get('/admin/tickets/:id', ensureAuthenticated, ensureEmployee, ticketController.employeeTicketDetail);
router.get('/admin/tickets/:id/messages', ensureAuthenticated, ensureEmployee, ticketController.ticketMessages);

// Updated routes for traditional form submissions
router.post('/admin/tickets/:id/update', ensureAuthenticated, ensureEmployee, ticketController.updateTicketEJS);
router.post('/admin/tickets/:id/assign-to-me', ensureAuthenticated, ensureEmployee, ticketController.assignTicketToMe);
router.post('/admin/tickets/:id/unassign', ensureAuthenticated, ensureEmployee, ticketController.unassignTicket);

router.post('/admin/tickets/:id/message', 
  ensureAuthenticated,
  ensureEmployee,
  ticketUpload.single('image'),
  ticketController.addMessage
);

// Admin feedback routes - Change to allow all employee types
router.get('/admin/feedback', ensureAuthenticated, ensureEmployee, feedbackController.adminFeedback);
router.get('/admin/feedback/:id', ensureAuthenticated, ensureEmployee, feedbackController.viewFeedbackDetails);

// Admin-only routes
router.post('/admin/tickets/delete', ensureAuthenticated, ensureAdmin, ticketController.deleteTicket);

module.exports = router;
