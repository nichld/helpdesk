const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { ensureAuthenticated, ensureEmployee } = require('../middleware/auth');
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

// Employee routes
router.get('/admin/dashboard', ensureAuthenticated, ensureEmployee, ticketController.employeeDashboard);
router.get('/admin/tickets', ensureAuthenticated, ensureEmployee, ticketController.employeeTickets);
router.get('/admin/tickets/assigned', ensureAuthenticated, ensureEmployee, ticketController.employeeAssignedTickets);
router.get('/admin/tickets/:id', ensureAuthenticated, ensureEmployee, ticketController.employeeTicketDetail);
router.get('/admin/tickets/:id/messages', ensureAuthenticated, ensureEmployee, ticketController.ticketMessages);
router.post('/admin/tickets/:id/update', ensureAuthenticated, ensureEmployee, ticketController.updateTicket);
router.post('/admin/tickets/:id/message', 
  ensureAuthenticated,
  ensureEmployee,
  ticketUpload.single('image'),
  ticketController.addMessage
);

module.exports = router;
