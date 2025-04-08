const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const authMiddleware = require('../middleware/auth');

/**
 * Configure Express application with middleware and settings
 * @param {Express} app - The Express application
 */
exports.configureExpress = (app) => {
  // Set up view engine and layouts
  app.use(expressLayouts);
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "../views/pages"));
  app.set("layout", path.join(__dirname, "../views/layouts/main"));
  
  // Static files
  app.use(express.static(path.join(__dirname, "../public")));
  
  // Parse request bodies
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  
  // Set current user for views
  app.use(authMiddleware.setCurrentUser);
};
