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
    
    console.log(`Request to add message to ticket: ${id}`);
    console.log('User ID:', req.session.user.id);
    console.log('User role:', req.session.user.role);
    console.log('Request path:', req.path);
    console.log('File:', req.file ? `${req.file.filename} (${req.file.size} bytes)` : 'No file');
    
    // Get the ticket to verify ownership for customers
    const ticketResult = await ticketService.getTicketById(id);
    
    if (!ticketResult.success) {
      console.log(`Ticket not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Check if user is customer and owns the ticket
    if (req.session.user.role === 'customer') {
      const customerId = ticketResult.ticket.customer._id.toString();
      const userId = req.session.user.id.toString();
      
      console.log('Ticket owner check:');
      console.log('- Customer ID from ticket:', customerId);
      console.log('- User ID from session:', userId);
      console.log('- Match:', customerId === userId);
      
      if (customerId !== userId) {
        console.log('Access denied: Customer trying to message a ticket they do not own');
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to message this ticket'
        });
      }
    }
    
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
    
    // If we have both text content and image, send text message separately
    if (req.file && content && content.trim().length > 0) {
      console.log('Message contains both image and text');
      
      // First send text message
      const textResult = await ticketService.addMessage(
        id,
        req.session.user.id,
        {
          content: content,
          contentType: 'text'
        }
      );
      
      if (!textResult.success) {
        return res.status(400).json({
          success: false,
          message: textResult.message
        });
      }
    }

    // Send image message if applicable, or just the text message
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
    
    console.log(`Message added successfully: ${result.message._id}`);
    res.status(201).json({
      success: true,
      message: result.message // Send the full message object back to client
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
    
    // Make sure to clearly log the user ID for debugging
    console.log('Employee viewing ticket - User ID:', req.session.user.id);
    console.log('Employee role:', req.session.user.role);
    
    res.render('tickets/employee-ticket-detail', {
      title: `Ticket: ${result.ticket.title}`,
      ticket: result.ticket,
      messages: result.messages,
      isEmployee: true,
      user: req.session.user // Explicitly pass the full user object
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

/**
 * Ticket messages view - shared between customer and employee
 */
exports.ticketMessages = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await ticketService.getTicketById(id);
    
    if (!result.success) {
      return res.render('error', {
        title: 'Ticket Not Found',
        message: result.message,
        error: { status: 404 }
      });
    }
    
    // Check permissions - customer can only see their own tickets
    if (req.session.user.role === 'customer') {
      const customerId = result.ticket.customer._id.toString();
      const userId = req.session.user.id.toString();
      
      if (customerId !== userId) {
        return res.render('error', {
          title: 'Access Denied',
          message: 'You do not have permission to view this ticket',
          error: { status: 403 }
        });
      }
    }
    
    // Determine if user is employee/admin for UI customization
    const isEmployee = req.session.user.role === 'employee' || req.session.user.role === 'admin';
    
    // Build the appropriate return URL based on user role
    const returnUrl = isEmployee 
      ? `/admin/tickets/${id}`
      : `/tickets/${id}`;
      
    res.render('tickets/ticket-messages', {
      title: `Messages for Ticket: ${result.ticket.title}`,
      ticket: result.ticket,
      messages: result.messages,
      isEmployee: isEmployee,
      returnUrl: returnUrl,
      isMessagesPage: true // Flag to indicate this is the messages page
    });
  } catch (error) {
    console.error('Error in ticketMessages:', error);
    res.render('error', {
      title: 'Error',
      message: 'An error occurred while loading ticket messages',
      error: { status: 500 }
    });
  }
};
