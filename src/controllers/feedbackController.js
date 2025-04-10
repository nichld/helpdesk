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
    
    // Return JSON success response instead of redirecting
    return res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!',
      redirectUrl: `/tickets/${ticketId}?success=Thank you for your feedback!`
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
      // Redirect back to ticket with a message instead of showing the feedback
      return res.redirect(`/tickets/${ticketId}?success=You have already provided feedback for this ticket. Thank you!`);
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
 * Admin feedback list
 */
exports.adminFeedback = async (req, res) => {
  try {
    // Get all feedback with filters if provided
    const { rating, satisfactionLevel, search } = req.query;
    const filters = {};
    
    if (rating) {
      filters.rating = parseInt(rating);
    }
    if (satisfactionLevel) {
      filters.satisfactionLevel = satisfactionLevel;
    }
    
    const result = await feedbackService.getAllFeedback(filters);
    // Get feedback stats
    const statsResult = await feedbackService.getFeedbackStats();
    
    res.render('feedback/admin-feedback', {
      title: 'Customer Feedback',
      feedbacks: result.success ? result.feedbacks : [],
      stats: statsResult.success ? statsResult.stats : null,
      filters: {
        rating: rating || '',
        satisfactionLevel: satisfactionLevel || '',
        search: search || ''
      },
      error: !result.success ? result.message : null,
      isEmployee: true,
      isAdmin: req.session.user.role === 'admin'
    });
  } catch (error) {
    console.error('Error in adminFeedback:', error);
    res.render('feedback/admin-feedback', {
      title: 'Customer Feedback',
      feedbacks: [],
      stats: null,
      filters: { rating: '', satisfactionLevel: '', search: '' },
      error: 'An error occurred while loading feedback data',
      isEmployee: true,
      isAdmin: req.session.user.role === 'admin'
    });
  }
};

/**
 * View feedback details
 */
exports.viewFeedbackDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await feedbackService.getFeedbackById(id);
    if (!result.success || !result.feedback) {
      return res.status(404).render('error', {
        title: 'Feedback Not Found',
        message: result.message || 'Feedback not found',
        error: { status: 404 }
      });
    }
    
    // Only check for employee access since we removed customer feedback viewing
    const isAdmin = req.session.user.role === 'admin';
    
    res.render('feedback/feedback-detail', {
      title: 'Feedback Details',
      feedback: result.feedback,
      isCustomer: false, // Always false now
      isAdmin: isAdmin,
      isEmployee: true // Always true since only employees can access
    });
  } catch (error) {
    console.error('Error viewing feedback details:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading feedback details',
      error: { status: 500, stack: process.env.NODE_ENV === 'production' ? null : error.stack }
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
