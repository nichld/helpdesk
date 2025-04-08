const homeService = require('../services/homeService');

/**
 * Renders the home page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.homePage = (req, res) => {
  const pageData = homeService.getHomePageData();
  
  res.render('index', {
    ...pageData,
  });
};
