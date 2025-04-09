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
    
    // Check if the request is AJAX or HTML form submission
    if (req.xhr || req.headers.accept.includes('application/json')) {
      return res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        feedback: result.feedback
      });
    } else {
      // For customers - redirect back to ticket with success message
      return res.redirect(`/tickets/${ticketId}?success=Thank you for your feedback! Your input is valuable to us.`);
    }
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
exports.renderFeedbackForm = async (req, res) => {) => {
  try {
    const { id: ticketId } = req.params;ticketId } = req.params;
    
    // Check if feedback already exists/ Check if feedback already exists
    const feedbackResult = await feedbackService.getTicketFeedback(ticketId);const feedbackResult = await feedbackService.getTicketFeedback(ticketId);
    
    if (feedbackResult.success && feedbackResult.feedback) {&& feedbackResult.feedback) {
      // Redirect back to ticket with a message instead of showing the feedbackes.render('tickets/feedback-submitted', {
      return res.redirect(`/tickets/${ticketId}?success=You have already provided feedback for this ticket. Thank you!`); title: 'Feedback Already Submitted',
    }eedbackResult.feedback,
    
    res.render('tickets/feedback-form', {
      title: 'Submit Feedback',
      ticketId
    });back-form', {
  } catch (error) {itle: 'Submit Feedback',
    console.error('Error in renderFeedbackForm:', error);   ticketId
    res.render('error', {  });
      title: 'Error',  } catch (error) {
      message: 'An error occurred while loading the feedback form', console.error('Error in renderFeedbackForm:', error);
      error: { status: 500 }, {
    });   title: 'Error',
  }ng the feedback form',
};rror: { status: 500 }

/**
 * Admin feedback list
 */
exports.adminFeedback = async (req, res) => {
  try {
    // Get all feedback with filters if provided
    const { rating, satisfactionLevel, search } = req.query;rts.adminFeedback = async (req, res) => {
    const filters = {};
    
    if (rating) {onst { rating, satisfactionLevel, search } = req.query;
      filters.rating = parseInt(rating);const filters = {};
    }
    if (rating) {
    if (satisfactionLevel) {rseInt(rating);
      filters.satisfactionLevel = satisfactionLevel;
    }
    
    const result = await feedbackService.getAllFeedback(filters);
    }
    // Get feedback stats
    const statsResult = await feedbackService.getFeedbackStats();Service.getAllFeedback(filters);
    
    // Debug log to see what's being returned
    console.log(`Feedback results: Found ${result.feedbacks ? result.feedbacks.length : 0} feedbacks`);esult = await feedbackService.getFeedbackStats();
    
    res.render('feedback/admin-feedback', {
      title: 'Customer Feedback',sults: Found ${result.feedbacks ? result.feedbacks.length : 0} feedbacks`);
      feedbacks: result.success ? result.feedbacks : [],
      stats: statsResult.success ? statsResult.stats : null,
      filters: {Feedback',
        rating: rating || '',ks : [],
        satisfactionLevel: satisfactionLevel || '',tats: statsResult.success ? statsResult.stats : null,
        search: search || ''
      },
      error: !result.success ? result.message : null,l || '',
      isEmployee: true,
      isAdmin: req.session.user.role === 'admin'
    });lt.success ? result.message : null,
  } catch (error) {
    console.error('Error in adminFeedback:', error);
    res.render('feedback/admin-feedback', {
      title: 'Customer Feedback',
      feedbacks: [],sole.error('Error in adminFeedback:', error);
      stats: null, res.render('feedback/admin-feedback', {
      filters: { rating: '', satisfactionLevel: '', search: '' },    title: 'Customer Feedback',
      error: 'An error occurred while loading feedback data',      feedbacks: [],
      isEmployee: true,   stats: null,
      isAdmin: req.session.user.role === 'admin' '', satisfactionLevel: '', search: '' },
    });   error: 'An error occurred while loading feedback data',
  }
};sAdmin: req.session.user.role === 'admin'

/**
 * View feedback details
 */
exports.viewFeedbackDetails = async (req, res) => {
  try {
    const { id } = req.params;
     => {
    // Debug log to help troubleshoot
    console.log(`Fetching feedback with ID: ${id}`);
    
    const result = await feedbackService.getFeedbackById(id);
    back with ID: ${id}`);
    if (!result.success || !result.feedback) {
      console.log('Feedback not found or error:', result.message);onst result = await feedbackService.getFeedbackById(id);
      return res.status(404).render('error', {
        title: 'Feedback Not Found',
        message: result.message || 'Feedback not found',', result.message);
        error: { status: 404 }r', {
      });
    }  message: result.message || 'Feedback not found',
    
    // Check permissions - customers can only view their own feedback
    if (req.session.user.role === 'customer') {
      // Get customer ID from the session
      const userId = req.session.user.id; Check permissions - customers can only view their own feedback
      
      // Use submittedBy instead of customer
      const feedbackSubmitterId = result.feedback.submittedBy ? result.feedback.submittedBy.toString() : undefined;
      
      console.log(`Comparing feedback submitter ID: ${feedbackSubmitterId} with current user ID: ${userId}`);
      = result.feedback.submittedBy ? result.feedback.submittedBy.toString() : undefined;
      // If the IDs don't match and user is not an employee/admin
      if (!feedbackSubmitterId || feedbackSubmitterId !== userId) {onsole.log(`Comparing feedback submitter ID: ${feedbackSubmitterId} with current user ID: ${userId}`);
        return res.status(403).render('error', { 
          title: 'Access Denied',  // If the IDs don't match and user is not an employee/admin
          message: 'You do not have permission to view this feedback',ackSubmitterId !== userId) {
          error: { status: 403 }
        });
      }feedback',
    }      error: { status: 403 }
    
    // Check if employee types can view
    const isEmployee = ['employee', 'it-employee', 'support-employee', 'admin'].includes(req.session.user.role);
    const isAdmin = req.session.user.role === 'admin';
    const isCustomer = req.session.user.role === 'customer';e types can view
    loyee', 'it-employee', 'support-employee', 'admin'].includes(req.session.user.role);
    res.render('feedback/feedback-detail', {st isAdmin = req.session.user.role === 'admin';
      title: 'Feedback Details',r = req.session.user.role === 'customer';
      feedback: result.feedback,
      isCustomer: isCustomer,ail', {
      isAdmin: isAdmin,k Details',
      isEmployee: isEmployee
    });
  } catch (error) {sAdmin: isAdmin,
    console.error('Error viewing feedback details:', error);   isEmployee: isEmployee
    res.status(500).render('error', {  });
      title: 'Error',  } catch (error) {
      message: 'An error occurred while loading feedback details', console.error('Error viewing feedback details:', error);
      error: { status: 500, stack: process.env.NODE_ENV === 'production' ? null : error.stack }
    });   title: 'Error',
  }back details',
};rror: { status: 500, stack: process.env.NODE_ENV === 'production' ? null : error.stack }

/**
 * Customer view of their submitted feedback
 */
exports.customerFeedbackList = async (req, res) => {
  try {
    // Get all feedback submitted by the current user
    const result = await feedbackService.getUserFeedback(req.session.user.id);.customerFeedbackList = async (req, res) => {
    
    res.render('feedback/customer-feedback', {
      title: 'My Submitted Feedback',erFeedback(req.session.user.id);
      feedback: result.success ? result.feedback : [],
      error: !result.success ? result.message : nulldback/customer-feedback', {
    });
  } catch (error) {eedback: result.success ? result.feedback : [],
    console.error('Error in customerFeedbackList:', error);   error: !result.success ? result.message : null
    res.render('feedback/customer-feedback', {  });
      title: 'My Submitted Feedback',  } catch (error) {
      feedback: [], console.error('Error in customerFeedbackList:', error);
      error: 'An error occurred while loading your feedback'er-feedback', {
    });   title: 'My Submitted Feedback',
  }
};rror: 'An error occurred while loading your feedback'

/**
 * Delete feedback (admin only)
 */
exports.deleteFeedback = async (req, res) => {
  try { * Delete feedback (admin only)
    const { feedbackId } = req.body;
    exports.deleteFeedback = async (req, res) => {
    if (!feedbackId) {
      return res.redirect('/admin/feedback?error=Feedback ID is required');
    }

    const result = await feedbackService.deleteFeedback(feedbackId); return res.redirect('/admin/feedback?error=Feedback ID is required');

    if (result.success) {
      return res.redirect('/admin/feedback?success=Feedback successfully deleted');
    } else {
      return res.redirect('/admin/feedback?error=' + encodeURIComponent(result.message));  if (result.success) {
    }      return res.redirect('/admin/feedback?success=Feedback successfully deleted');






};  }    res.redirect('/admin/feedback?error=An error occurred while deleting the feedback');    console.error('Error deleting feedback:', error);  } catch (error) {    } else {
      return res.redirect('/admin/feedback?error=' + encodeURIComponent(result.message));
    }
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.redirect('/admin/feedback?error=An error occurred while deleting the feedback');
  }
};
