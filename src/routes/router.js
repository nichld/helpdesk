const express = require('express');
const homeRoutes = require('./homeRoutes');
const authRoutes = require('./authRoutes');
const { notFoundHandler, globalErrorHandler } = require('../middleware/errorMiddleware');

const router = express.Router();

// Regular routes
router.use('/', homeRoutes);
router.use('/', authRoutes);

// Error handling routes
router.use(notFoundHandler); // Handle 404 errors
router.use(globalErrorHandler); // Handle all other errors

module.exports = router;