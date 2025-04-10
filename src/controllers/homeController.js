const homeService = require('../services/homeService');
const fs = require('fs');
const path = require('path');

/**
 * Renders the home page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.homePage = (req, res) => {
  const pageData = homeService.getHomePageData();
  
  // Load FAQ data
  const faqDataPath = path.join(__dirname, '../config/faqData.json');
  let faqs = [];
  
  try {
    const faqData = fs.readFileSync(faqDataPath, 'utf8');
    faqs = JSON.parse(faqData);
  } catch (error) {
    console.error('Error loading FAQ data:', error);
  }
  
  res.render('index', {
    ...pageData,
    faqs: faqs
  });
};

/**
 * Render the guides page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.guidesPage = (req, res) => {
  const pageData = homeService.getGuidesPageData();
  
  res.render('pages/guides/index', {
    ...pageData
  });