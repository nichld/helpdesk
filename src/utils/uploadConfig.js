const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Ensure upload directories exist
const createDirectories = () => {
  const dirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/profiles'),
    path.join(__dirname, '../../uploads/tickets')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Create necessary directories
createDirectories();

// Configure storage for initial file upload (temporarily)
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on file type or route
    let uploadPath = path.join(__dirname, '../../uploads');
    
    if (req.route.path.includes('profile')) {
      uploadPath = path.join(uploadPath, 'profiles');
    } else if (req.route.path.includes('ticket') || req.route.path.includes('message')) {
      uploadPath = path.join(uploadPath, 'tickets');
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-temp`); // Temporary file without extension
  }
});

// More permissive file filter to accept various image formats
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Custom file processing middleware to convert images to PNG
const processImage = (directory) => {
  return async (req, res, next) => {
    if (!req.file) {
      return next(); // No file uploaded, skip processing
    }
    
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const outputFilename = `${uniqueSuffix}.png`;
      const outputPath = path.join(directory, outputFilename);
      
      // Convert image to PNG format using sharp
      await sharp(req.file.path)
        .png()
        .toFile(outputPath);
        
      // Delete the temporary file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
      
      // Update req.file with new information
      req.file.path = outputPath;
      req.file.filename = outputFilename;
      req.file.mimetype = 'image/png';
      
      next();
    } catch (error) {
      console.error('Image processing error:', error);
      next(error);
    }
  };
};

// Create multer instances for different scenarios
const createUploader = (fileSize, type) => {
  const directory = path.join(__dirname, '../../uploads', type);
  
  // Ensure specific directory exists
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  
  // Create the multer uploader
  const uploader = multer({
    storage: diskStorage,
    fileFilter: fileFilter,
    limits: {
      fileSize: fileSize
    }
  }).single('image');
  
  // Return middleware function that processes the upload and then converts the image
  return function(req, res, next) {
    uploader(req, res, (err) => {
      if (err) {
        return next(err);
      }
      
      // Process and convert the image
      processImage(directory)(req, res, next);
    });
  };
};

// Export middleware functions for different upload scenarios
module.exports = {
  profileUpload: createUploader(5 * 1024 * 1024, 'profiles'),
  ticketUpload: createUploader(10 * 1024 * 1024, 'tickets')
};
