const express = require('express');
const homeRoutes = require('./homeRoutes');
const authRoutes = require('./authRoutes');
const ticketRoutes = require('./ticketRoutes');
const feedbackRoutes = require('./feedbackRoutes');
const { notFoundHandler, globalErrorHandler } = require('../middleware/errorMiddleware');

const router = express.Router();

// Regular routes
router.use('/', homeRoutes);
router.use('/', authRoutes);
router.use('/', ticketRoutes);
router.use('/', feedbackRoutes);

// Error handling routes
router.use(notFoundHandler); // Handle 404 errors
router.use(globalErrorHandler); // Handle all other errors

module.exports = router;