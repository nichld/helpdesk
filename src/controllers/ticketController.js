const ticketService = require('../services/ticketService');
const path = require('path');

/**
 * Customer ticket list view
 */
exports.customerTickets = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Get tickets for the current customer
    const result = await ticketService.getAllTickets({
      customer: req.session.user.id,
      status: status || undefined
    });
    
    if (!result.success) {
      return res.render('tickets/customer-tickets', {
        title: 'My Tickets',
        error: result.message,
        tickets: [],
        filter: status || 'all'
      });
    }
    
    res.render('tickets/customer-tickets', {
      title: 'My Tickets',
      tickets: result.tickets,
      filter: status || 'all'
    });
  } catch (error) {
    console.error('Error in customerTickets:', error);
    res.render('tickets/customer-tickets', {
      title: 'My Tickets',
      error: 'An error occurred while loading your tickets',
      tickets: [],
      filter: 'all'
    });
  }
};

/**
 * Customer ticket detail view
 */
exports.customerTicketDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await ticketService.getTicketById(id);
    
    if (!result.success) {
      return res.render('error', {
        title: 'Ticket Not Found',
        message: result.message,
        error: {
          status: 404
        }
      });
    }
    
    // Extract IDs for comparison, ensuring both are strings
    const customerId = result.ticket.customer._id.toString();
    const userId = req.session.user.id.toString();
    
    // Debug log to help identify the issue
    console.log(`Comparing ticket customer ID: ${customerId} with current user ID: ${userId}`);
    console.log(`User role: ${req.session.user.role}`);
    
    // Allow access to ticket if the user is:
    // 1. The ticket's customer OR
    // 2. An employee OR
    // 3. An admin
    const isTicketOwner = customerId === userId;
    const isEmployee = req.session.user.role === 'employee';
    const isAdmin = req.session.user.role === 'admin';
    
    if (!isTicketOwner && !isEmployee && !isAdmin) {
      console.log('Access denied: User is not authorized to view this ticket');
      return res.render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to view this ticket',
        error: {
          status: 403
        }
      });
    }
    
    // User has permission, render the ticket page
    res.render('tickets/ticket-detail', {
      title: `Ticket: ${result.ticket.title}`,
      ticket: result.ticket,
      messages: result.messages,
      isEmployee: isEmployee || isAdmin
    });
  } catch (error) {
    console.error('Error in customerTicketDetail:', error);
    res.render('error', {
      title: 'Error',
      message: 'An error occurred while loading the ticket',
      error: {
        status: 500,
        stack: process.env.NODE_ENV === 'production' ? null : error.stack
      }
    });
  }
};

/**
 * Customer create ticket view
 */
exports.createTicketView = (req, res) => {
  res.render('tickets/create-ticket', {
    title: 'Create New Ticket'
  });
};

/**
 * Customer create ticket action
 */
exports.createTicket = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    
    const result = await ticketService.createTicket(
      { title, description, category },
      req.session.user.id
    );
    
    if (!result.success) {
      return res.render('tickets/create-ticket', {
        title: 'Create New Ticket',
        error: result.message,
        form: { title, description, category }
      });
    }
    
    // Redirect to the new ticket
    res.redirect(`/tickets/${result.ticket._id}`);
  } catch (error) {
    console.error('Error in createTicket:', error);
    res.render('tickets/create-ticket', {
      title: 'Create New Ticket',
      error: 'An error occurred while creating the ticket',
      form: req.body
    });
  }
};

/**
 * Add message to ticket
 */
exports.addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    let { content } = req.body;
    
    console.log('Adding message to ticket:', id);
    console.log('Request body:', req.body);
    console.log('File:', req.file);
    
    // Create message data object
    let messageData = {
      content: content || '', // Use empty string if no content provided
      contentType: 'text'
    };
    
    // Handle file upload if present
    if (req.file) {
      messageData = {
        content: content || '', // Keep any text content even with image
        contentType: 'image',
        fileUrl: `/uploads/tickets/${path.basename(req.file.path)}`
      };
    }
    
    // Ensure we have either content or an image
    if (!messageData.content && !req.file) {
      console.log('Empty message rejected');
      return res.status(400).json({
        success: false,
        message: 'Message requires either text content or an image'
      });
    }

    const result = await ticketService.addMessage(
      id,
      req.session.user.id,
      messageData
    );
    
    if (!result.success) {
      console.log('Failed to add message:', result.message);
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    console.log('Message added successfully');
    res.status(201).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error in addMessage:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while adding the message'
    });
  }
};

/**
 * Employee dashboard
 */
exports.employeeDashboard = async (req, res) => {
  try {
    // Get ticket statistics
    const statsResult = await ticketService.getTicketStats();
    
    // Get recent open tickets
    const ticketsResult = await ticketService.getAllTickets({
      status: ['open', 'in-progress']
    });
    
    res.render('tickets/employee-dashboard', {
      title: 'Ticket Dashboard',
      stats: statsResult.success ? statsResult.stats : null,
      tickets: ticketsResult.success ? ticketsResult.tickets.slice(0, 10) : [],
      error: (!statsResult.success || !ticketsResult.success) ? 
        'Some data could not be loaded' : null
    });
  } catch (error) {
    console.error('Error in employeeDashboard:', error);
    res.render('tickets/employee-dashboard', {
      title: 'Ticket Dashboard',
      stats: null,
      tickets: [],
      error: 'An error occurred while loading the dashboard'
    });
  }
};

/**
 * Employee ticket list
 */
exports.employeeTickets = async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    
    // Build filter object
    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (category) filters.category = category;
    
    const result = await ticketService.getAllTickets(filters);
    
    res.render('tickets/employee-tickets', {
      title: 'All Tickets',
      tickets: result.success ? result.tickets : [],
      filters: {
        status: status || 'all',
        priority: priority || 'all',
        category: category || 'all'
      },
      error: !result.success ? result.message : null
    });
  } catch (error) {
    console.error('Error in employeeTickets:', error);
    res.render('tickets/employee-tickets', {
      title: 'All Tickets',
      tickets: [],
      filters: { status: 'all', priority: 'all', category: 'all' },
      error: 'An error occurred while loading tickets'
    });
  }
};

/**
 * Employee assigned tickets
 */
exports.employeeAssignedTickets = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Get tickets assigned to the current employee
    const filters = {
      assignedTo: req.session.user.id
    };
    
    if (status) filters.status = status;
    
    const result = await ticketService.getAllTickets(filters);
    
    res.render('tickets/employee-assigned', {
      title: 'My Assigned Tickets',
      tickets: result.success ? result.tickets : [],
      filter: status || 'all',
      error: !result.success ? result.message : null
    });
  } catch (error) {
    console.error('Error in employeeAssignedTickets:', error);
    res.render('tickets/employee-assigned', {
      title: 'My Assigned Tickets',
      tickets: [],
      filter: 'all',
      error: 'An error occurred while loading assigned tickets'
    });
  }
};

/**
 * Employee ticket detail
 */
exports.employeeTicketDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await ticketService.getTicketById(id);
    
    if (!result.success) {
      return res.render('error', {
        title: 'Ticket Not Found',
        message: result.message,
        error: {
          status: 404
        }
      });
    }
    
    res.render('tickets/employee-ticket-detail', {
      title: `Ticket: ${result.ticket.title}`,
      ticket: result.ticket,
      messages: result.messages,
      isEmployee: true
    });
  } catch (error) {
    console.error('Error in employeeTicketDetail:', error);
    res.render('error', {
      title: 'Error',
      message: 'An error occurred while loading the ticket',
      error: {
        status: 500
      }
    });
  }
};

/**
 * Update ticket
 */
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, category, assignTo } = req.body;
    
    // Build update data
    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (category) updateData.category = category;
    if (assignTo === 'me') {
      updateData.assignedTo = req.session.user.id;
    } else if (assignTo === 'none') {
      updateData.assignedTo = null;
    }
    
    const result = await ticketService.updateTicket(id, updateData);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    res.status(200).json({
      success: true,
      ticket: result.ticket
    });
  } catch (error) {
    console.error('Error in updateTicket:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the ticket'
    });
  }
};
