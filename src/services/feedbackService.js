const Feedback = require('../models/Feedback');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Message = require('../models/Message');
const mongoose = require('mongoose');

/**
 * Submit feedback for a ticket
 * @param {string} ticketId - ID of the ticket
 * @param {Object} feedbackData - Feedback data (rating, satisfaction, etc)
 * @param {string} userId - User submitting the feedback
 */
exports.submitFeedback = async (ticketId, feedbackData, userId) => {
  try {
    // Verify ticket exists and is in the correct state
    const ticket = await Ticket.findById(ticketId)
      .populate('customer', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');
    
    if (!ticket) {
      return { 
        success: false, 
        message: 'Ticket not found' 
      };
    }
    
    // Check if ticket is in a state where feedback can be provided
    if (ticket.status !== 'solved' && ticket.status !== 'closed') {
      return { 
        success: false,
        message: 'Feedback can only be provided for solved or closed tickets' 
      };
    }
    
    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ ticketReference: ticketId.toString() });
    
    if (existingFeedback) {
      return {
        success: false,
        message: 'Feedback has already been submitted for this ticket'
      };
    }
    
    // Get all messages for this ticket to store message history
    const messages = await Message.find({ ticket: ticketId })
      .populate('sender', 'firstName lastName email role')
      .sort('createdAt');
    
    // Format messages for storage
    const messageHistory = messages.map(message => ({
      content: message.content,
      contentType: message.contentType,
      fileUrl: message.fileUrl,
      senderName: message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Unknown',
      senderRole: message.sender ? message.sender.role : 'unknown',
      senderEmail: message.sender ? message.sender.email : 'unknown',
      sentAt: message.createdAt
    }));
    
    // Count the number of messages in this ticket
    const messageCount = messages.length;
    
    // Create a snapshot of the ticket data
    const ticketSnapshot = {
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      closedAt: ticket.lastActivity,
      customer: ticket.customer ? {
        _id: ticket.customer._id,
        firstName: ticket.customer.firstName,
        lastName: ticket.customer.lastName,
        email: ticket.customer.email
      } : null,
      assignedTo: ticket.assignedTo ? {
        _id: ticket.assignedTo._id,
        firstName: ticket.assignedTo.firstName,
        lastName: ticket.assignedTo.lastName,
        email: ticket.assignedTo.email
      } : null
    };
    
    // Create the feedback record with message history
    const feedback = await Feedback.create({
      ticketId: ticket._id,
      ticketReference: ticket._id.toString(),
      ticketSnapshot: ticketSnapshot,
      messageCount: messageCount,
      messageHistory: messageHistory, // Add message history
      rating: feedbackData.rating,
      satisfactionLevel: feedbackData.satisfactionLevel,
      timeToResolution: feedbackData.timeToResolution,
      comments: feedbackData.comments,
      submittedBy: userId
    });
    
    return {
      success: true,
      feedback
    };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return {
      success: false,
      message: 'An error occurred while submitting feedback'
    };
  }
};

/**
 * Get feedback for a specific ticket
 */
exports.getTicketFeedback = async (ticketId) => {
  try {
    const feedback = await Feedback.findOne({ ticketReference: ticketId.toString() })
      .populate('submittedBy', 'firstName lastName email');
    
    return {
      success: true,
      feedback
    };
  } catch (error) {
    console.error('Error getting ticket feedback:', error);
    return {
      success: false,
      message: 'An error occurred while retrieving feedback'
    };
  }
};

/**
 * Get all feedback with optional filters
 */
exports.getAllFeedback = async (filters = {}) => {
  try {
    console.log('Getting all feedback with filters:', filters);
    
    // Build query
    const query = {};
    
    if (filters.rating) {
      query.rating = filters.rating;
    }
    
    if (filters.satisfactionLevel) {
      query.satisfactionLevel = filters.satisfactionLevel;
    }
    
    // Get all feedback with corrected population
    const feedbacks = await Feedback.find(query)
      // If you need to populate ticketId, use this instead of 'ticket'
      .populate({
        path: 'ticketId', 
        select: 'title customer status',
        populate: {
          path: 'customer',
          select: 'firstName lastName email'
        }
      })
      .sort({ submittedAt: -1 });
    
    console.log(`Found ${feedbacks.length} feedbacks`);
    
    // Process each feedback
    const processedFeedbacks = feedbacks.map(feedback => {
      // Convert to plain object to allow adding new properties
      const feedbackObj = feedback.toObject();
      
      // We're assuming ticketSnapshot already contains the necessary data
      // No need to create it from ticketId 
      
      return feedbackObj;
    });
    
    return {
      success: true,
      feedbacks: processedFeedbacks
    };
  } catch (error) {
    console.error('Error getting all feedback:', error);
    return {
      success: false,
      message: error.message || 'Failed to get feedback'
    };
  }
};

/**
 * Get feedback statistics
 */
exports.getFeedbackStats = async () => {
  try {
    const totalFeedback = await Feedback.countDocuments();
    
    // Calculate average rating
    const ratingResult = await Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    const avgRating = ratingResult.length > 0 ? ratingResult[0].avgRating : 0;
    
    // Get satisfaction distribution
    const satisfactionDistribution = await Feedback.aggregate([
      { $group: { _id: '$satisfactionLevel', count: { $sum: 1 } } }
    ]);
    
    // Convert to more usable format
    const distribution = {
      'very-dissatisfied': 0,
      'dissatisfied': 0,
      'neutral': 0,
      'satisfied': 0,
      'very-satisfied': 0
    };
    
    satisfactionDistribution.forEach(item => {
      distribution[item._id] = item.count;
    });
    
    return {
      success: true,
      stats: {
        totalFeedback,
        avgRating,
        distribution
      }
    };
  } catch (error) {
    console.error('Error getting feedback stats:', error);
    return {
      success: false, 
      message: 'An error occurred while retrieving feedback statistics'
    };
  }
};

/**
 * Get feedback by ID
 */
exports.getFeedbackById = async (id) => {
  try {
    console.log(`Getting feedback by ID: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return {
        success: false,
        message: 'Invalid feedback ID format'
      };
    }
    
    // Changed 'ticket' to 'ticketId' to match the schema field name
    const feedback = await Feedback.findById(id)
      .populate({
        path: 'ticketId',  // Changed from 'ticket' to 'ticketId'
        select: 'title customer status description',
        populate: {
          path: 'customer',
          select: 'firstName lastName email'
        }
      })
      .populate('submittedBy', 'firstName lastName email');
    
    if (!feedback) {
      console.log(`Feedback not found with ID: ${id}`);
      return {
        success: false,
        message: 'Feedback not found'
      };
    }
    
    console.log('Feedback found:', feedback._id);
    
    return {
      success: true,
      feedback
    };
  } catch (error) {
    console.error(`Error getting feedback by ID ${id}:`, error);
    return {
      success: false,
      message: error.message || 'Failed to get feedback'
    };
  }
};

/**
 * Get all feedback submitted by a user
 */
exports.getUserFeedback = async (userId) => {
  try {
    const feedback = await Feedback.find({ submittedBy: userId })
      .sort({ submittedAt: -1 });
    
    return {
      success: true,
      feedback
    };
  } catch (error) {
    console.error('Error getting user feedback:', error);
    return {
      success: false,
      message: 'An error occurred while retrieving feedback'
    };
  }
};

/**
 * Delete feedback (admin only)
 */
exports.deleteFeedback = async (feedbackId) => {
  try {
    const result = await Feedback.findByIdAndDelete(feedbackId);
    
    if (!result) {
      return {
        success: false,
        message: 'Feedback not found'
      };
    }
    
    return {
      success: true,
      message: 'Feedback successfully deleted'
    };
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return {
      success: false,
      message: 'An error occurred while deleting feedback'
    };
  }
};
