const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const { getIO } = require('../config/socket');

/**
 * Create a new ticket
 */
exports.createTicket = async (ticketData, userId) => {
  try {
    const ticket = await Ticket.create({
      ...ticketData,
      customer: userId
    });
    
    return {
      success: true,
      ticket
    };
  } catch (error) {
    console.error('Error creating ticket:', error);
    return {
      success: false,
      message: error.message || 'Failed to create ticket'
    };
  }
};

/**
 * Get all tickets with optional filters
 */
exports.getAllTickets = async (filters = {}) => {
  try {
    let query = {};
    
    // Apply filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status };
      } else {
        query.status = filters.status;
      }
    }
    
    if (filters.priority) {
      query.priority = filters.priority;
    }
    
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.customer) {
      query.customer = filters.customer;
    }
    
    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }
    
    // Get tickets with populated fields
    const tickets = await Ticket.find(query)
      .populate('customer', 'firstName lastName email profileImage')
      .populate('assignedTo', 'firstName lastName email profileImage')
      .sort({ lastActivity: -1 });
    
    return {
      success: true,
      tickets
    };
  } catch (error) {
    console.error('Error getting tickets:', error);
    return {
      success: false,
      message: error.message || 'Failed to get tickets'
    };
  }
};

/**
 * Get ticket by ID
 */
exports.getTicketById = async (ticketId) => {
  try {
    const ticket = await Ticket.findById(ticketId)
      .populate('customer', 'firstName lastName email profileImage')
      .populate('assignedTo', 'firstName lastName email profileImage');
    
    if (!ticket) {
      return {
        success: false,
        message: 'Ticket not found'
      };
    }
    
    // Get messages for the ticket
    const messages = await Message.find({ ticket: ticketId })
      .populate('sender', 'firstName lastName email profileImage role')
      .sort('createdAt');
    
    return {
      success: true,
      ticket,
      messages
    };
  } catch (error) {
    console.error('Error getting ticket:', error);
    return {
      success: false,
      message: error.message || 'Failed to get ticket'
    };
  }
};

/**
 * Update ticket details
 */
exports.updateTicket = async (ticketId, updateData) => {
  try {
    // Ensure we have valid data to update
    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        message: 'No update data provided'
      };
    }
    
    // Only allow specific fields to be updated (add responsibleRole)
    const validFields = ['status', 'priority', 'category', 'assignedTo', 'responsibleRole'];
    const filteredData = {};
    
    Object.keys(updateData).forEach(key => {
      if (validFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });
    
    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      { ...filteredData, lastActivity: Date.now() },
      { new: true }
    )
    .populate('customer', 'firstName lastName email profileImage')
    .populate('assignedTo', 'firstName lastName email profileImage');
    
    if (!ticket) {
      return {
        success: false,
        message: 'Ticket not found'
      };
    }
    
    // Notify connected clients about the update
    try {
      const io = getIO();
      if (io) {
        io.to(`ticket-${ticketId}`).emit('ticket-updated', { ticket });
      }
    } catch (error) {
      console.error('Socket.io notification error:', error);
      // Continue even if socket notification fails
    }
    
    return {
      success: true,
      ticket
    };
  } catch (error) {
    console.error('Error updating ticket:', error);
    return {
      success: false,
      message: error.message || 'Failed to update ticket'
    };
  }
};

/**
 * Add a message to a ticket
 */
exports.addMessage = async (ticketId, userId, messageData) => {
  try {
    const ticket = await Ticket.findById(ticketId);
    console.log(`Adding message to ticket ${ticketId} by user ${userId}`);
    
    if (!ticket) {
      console.log(`Ticket not found: ${ticketId}`);
      return {
        success: false,
        message: 'Ticket not found'
      };
    }
    
    // For image uploads, only fileUrl is required
    // For text messages, content is required
    if (messageData.contentType === 'text' && !messageData.content.trim()) {
      console.log('Empty text message rejected');
      return {
        success: false,
        message: 'Text message content is required'
      };
    } else if (messageData.contentType === 'image' && !messageData.fileUrl) {
      console.log('Image message with no file rejected');
      return {
        success: false,
        message: 'Image file is required'
      };
    }
    
    console.log('Creating message with data:', JSON.stringify(messageData));
    
    // Create the message
    const message = await Message.create({
      ticket: ticketId,
      sender: userId,
      ...messageData,
      read: [{ user: userId }] // Mark as read by sender
    });
    
    console.log(`Message created with ID: ${message._id}`);
    
    // Populate sender info
    await message.populate('sender', 'firstName lastName email profileImage role');
    
    // Update ticket's lastActivity
    ticket.lastActivity = Date.now();
    await ticket.save();
    
    // Notify connected clients about the new message
    try {
      const io = getIO();
      if (io) {
        console.log(`Emitting new-message event to room ticket-${ticketId}`);
        io.to(`ticket-${ticketId}`).emit('new-message', { message });
        
        // Log how many clients are in this room
        const room = io.sockets.adapter.rooms.get(`ticket-${ticketId}`);
        const clientCount = room ? room.size : 0;
        console.log(`Room ticket-${ticketId} has ${clientCount} clients connected`);
      } else {
        console.warn('Socket.IO not initialized, cannot emit events');
      }
    } catch (error) {
      console.error('Socket.io notification error:', error);
      // Continue even if socket notification fails
    }
    
    return {
      success: true,
      message: message // Return the complete message object
    };
  } catch (error) {
    console.error('Error adding message:', error);
    return {
      success: false,
      message: error.message || 'Failed to add message'
    };
  }
};

/**
 * Get ticket statistics
 */
exports.getTicketStats = async () => {
  try {
    const stats = {
      total: await Ticket.countDocuments(),
      open: await Ticket.countDocuments({ status: 'open' }),
      inProgress: await Ticket.countDocuments({ status: 'in-progress' }),
      solved: await Ticket.countDocuments({ status: 'solved' }),
      closed: await Ticket.countDocuments({ status: 'closed' })
    };
    
    stats.openPercentage = Math.round((stats.open / stats.total) * 100) || 0;
    stats.inProgressPercentage = Math.round((stats.inProgress / stats.total) * 100) || 0;
    stats.solvedPercentage = Math.round((stats.solved / stats.total) * 100) || 0;
    stats.closedPercentage = Math.round((stats.closed / stats.total) * 100) || 0;
    
    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error getting ticket stats:', error);
    return {
      success: false,
      message: error.message || 'Failed to get ticket statistics'
    };
  }
};

/**
 * Delete a ticket (admin only)
 * @param {string} ticketId - ID of ticket to delete
 * @returns {Object} Delete result
 */
exports.deleteTicket = async (ticketId) => {
  try {
    const ticket = await Ticket.findById(ticketId);
    
    if (!ticket) {
      return {
        success: false,
        message: 'Ticket not found'
      };
    }
    
    // Only allow deletion of solved or closed tickets
    if (ticket.status !== 'solved' && ticket.status !== 'closed') {
      return {
        success: false,
        message: 'Only solved or closed tickets can be deleted'
      };
    }
    
    // Delete associated messages
    await Message.deleteMany({ ticket: ticketId });
    
    // Delete the ticket
    await Ticket.findByIdAndDelete(ticketId);
    
    return {
      success: true,
      message: 'Ticket successfully deleted'
    };
  } catch (error) {
    console.error('Ticket deletion error:', error);
    return {
      success: false,
      message: 'An error occurred while deleting the ticket'
    };
  }
};
