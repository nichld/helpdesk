const express = require('express');
const { notFoundHandler, globalErrorHandler } = require('../middleware/errorMiddleware');

const router = express.Router();

// This router doesn't define any routes, but just exports
// the middleware for use in the main router
module.exports = { 
  notFoundHandler,
  globalErrorHandler
};
