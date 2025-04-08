/**
 * Handles 404 errors for routes that don't exist
 */
exports.notFoundHandler = (req, res, next) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist or has been moved.',
    error: {
      status: 404,
      stack: process.env.NODE_ENV === 'production' ? null : new Error().stack
    }
  });
};

/**
 * Global error handler
 */
exports.globalErrorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Something went wrong on our end.';
  
  // Log error details (don't log 404s as errors)
  if (status !== 404) {
    console.error(`[Error ${status}]: ${message}`);
    if (err.stack) {
      console.error(err.stack);
    }
  }
  
  // Production error message sanitization
  const displayMessage = process.env.NODE_ENV === 'production' && status === 500
    ? 'An unexpected error occurred on the server. Our team has been notified.'
    : message;
  
  res.status(status).render('error', {
    title: status === 500 ? 'Server Error' : err.title || 'Error',
    message: displayMessage,
    error: {
      status: status,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    }
  });
};
