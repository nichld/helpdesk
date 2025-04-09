const feedbackService = require('../services/feedbackService');

/**
 * Submit feedback for a ticket
 */
exports.submitFeedback = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const { rating, satisfactionLevel, timeToResolution, comments } = req.body;
    
    // Validate required fields
    if (!rating || !satisfactionLevel || !timeToResolution) {
      return res.status(400).json({
        success: false,
        message: 'Rating, satisfaction level, and time to resolution are required'
      });
    }
    
    const result = await feedbackService.submitFeedback(
      ticketId, 
      { rating, satisfactionLevel, timeToResolution, comments }, 
      req.session.user.id
    );
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: result.feedback
    });
  } catch (error) {
    console.error('Error in submitFeedback:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while submitting feedback'
    });
  }
};

/**
 * Display feedback form for a ticket
 */
exports.renderFeedbackForm = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    
    // Check if feedback already exists
    const feedbackResult = await feedbackService.getTicketFeedback(ticketId);
    
    if (feedbackResult.success && feedbackResult.feedback) {
      return res.render('tickets/feedback-submitted', {
        title: 'Feedback Already Submitted',
        feedback: feedbackResult.feedback,
        ticketId
      });
    }
    
    res.render('tickets/feedback-form', {
      title: 'Submit Feedback',
      ticketId
    });
  } catch (error) {
    console.error('Error in renderFeedbackForm:', error);
    res.render('error', {
      title: 'Error',
      message: 'An error occurred while loading the feedback form',
      error: { status: 500 }
    });
  }
};

/**
 * Admin/Employee view for all feedback
 */
exports.adminFeedback = async (req, res) => {
  try {
    // This function is now accessible to all employee types via the updated route
    const result = await feedbackService.getAllFeedback();
    
    res.render('feedback/admin-feedback', {
      title: 'Customer Feedback',
      feedbacks: result.success ? result.feedbacks : [],
      error: !result.success ? result.message : null,
      // Allow access to all employee types
      isEmployee: true
    });
  } catch (error) {
    console.error('Error loading admin feedback:', error);
    res.render('feedback/admin-feedback', {
      title: 'Customer Feedback',
      feedbacks: [],
      error: 'An error occurred while loading feedback data'
    });
  }
};

/**
 * View single feedback detail (accessible by customer who submitted it, or any employee/admin)
 */
exports.viewFeedbackDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await feedbackService.getFeedbackById(id);
    
    if (!result.success) {
      return res.status(404).render('error', {
        title: 'Feedback Not Found',
        message: result.message,
        error: { status: 404 }
      });
    }
    
    // Check if the user is a customer and owns this feedback
    const isCustomer = req.session.user.role === 'customer';
    const isAdmin = req.session.user.role === 'admin';
    // Add check for any employee type
    const isEmployee = ['employee', 'it-employee', 'support-employee', 'admin'].includes(req.session.user.role);
    
    if (isCustomer) {
      // Customer can only see their own feedback
      if (result.feedback.customer.toString() !== req.session.user.id) {
        return res.status(403).render('error', {
          title: 'Access Denied',
          message: 'You do not have permission to view this feedback',
          error: { status: 403 }
        });
      }
    }
    
    res.render('feedback/feedback-detail', {
      title: 'Feedback Details',
      feedback: result.feedback,
      isCustomer: isCustomer,
      // Allow admin-specific actions for admins
      isAdmin: isAdmin,
      // Allow employee access
      isEmployee: isEmployee
    });
  } catch (error) {
    console.error('Error viewing feedback details:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading feedback details',
      error: { status: 500 }
    });
  }
};

/**
 * Customer view of their submitted feedback
 */
exports.customerFeedbackList = async (req, res) => {
  try {
    // Get all feedback submitted by the current user
    const result = await feedbackService.getUserFeedback(req.session.user.id);
    
    res.render('feedback/customer-feedback', {
      title: 'My Submitted Feedback',
      feedback: result.success ? result.feedback : [],
      error: !result.success ? result.message : null
    });
  } catch (error) {
    console.error('Error in customerFeedbackList:', error);
    res.render('feedback/customer-feedback', {
      title: 'My Submitted Feedback',
      feedback: [],
      error: 'An error occurred while loading your feedback'
    });
  }
};

/**
 * Delete feedback (admin only)
 */
exports.deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.body;
    
    if (!feedbackId) {
      return res.redirect('/admin/feedback?error=Feedback ID is required');
    }

    const result = await feedbackService.deleteFeedback(feedbackId);

    if (result.success) {
      return res.redirect('/admin/feedback?success=Feedback successfully deleted');
    } else {
      return res.redirect('/admin/feedback?error=' + encodeURIComponent(result.message));
    }
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.redirect('/admin/feedback?error=An error occurred while deleting the feedback');
  }
};
