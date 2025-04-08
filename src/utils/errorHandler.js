/**
 * Custom error class with HTTP status code
 */
class AppError extends Error {
  constructor(message, statusCode, title = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.title = title || this.getDefaultTitle(statusCode);
    this.isOperational = true; // Used to distinguish operational vs programming errors

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Gets a default title based on status code
   */
  getDefaultTitle(code) {
    const titles = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Access Denied',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Validation Error',
      500: 'Server Error'
    };
    return titles[code] || 'Error';
  }
}

/**
 * Wrapper for async functions to avoid try-catch blocks
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const catchAsync = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  AppError,
  catchAsync
};
