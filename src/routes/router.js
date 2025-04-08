const express = require('express');
const homeRoutes = require('./homeRoutes');
const authRoutes = require('./authRoutes');

const router = express.Router();

router.use('/', homeRoutes);
router.use('/', authRoutes);

module.exports = router;