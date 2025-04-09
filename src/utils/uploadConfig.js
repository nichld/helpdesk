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

// Configure storage
const storage = multer.diskStorage({
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
    
    // Store uploaded file with .tmp extension first, will be converted to PNG later
    cb(null, `${uniqueSuffix}.tmp`);
  }
});

// File filter to only accept images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Function to convert uploaded image to PNG
const convertToPng = async (filePath, outputFilename) => {
  const outputPath = path.join(path.dirname(filePath), outputFilename);
  
  await sharp(filePath)
    .png()
    .toFile(outputPath);
    
  // Delete the original temporary file
  fs.unlink(filePath, (err) => {
    if (err) console.error('Error deleting temp file:', err);
  });
  
  return outputPath;
};

// Create multer instances for different scenarios
const profileUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const ticketUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Wrap multer with PNG conversion middleware
const wrapWithPngConversion = (multerMiddleware) => {
  // Create a multer middleware wrapper that preserves the single() method
  const wrapper = Object.create(multerMiddleware);
  
  // Override the single() method to add PNG conversion
  wrapper.single = (fieldName) => {
    const originalSingleMiddleware = multerMiddleware.single(fieldName);
    
    // Return a new middleware function
    return async (req, res, next) => {
      // Use the original multer middleware first
      originalSingleMiddleware(req, res, async (err) => {
        if (err) return next(err);
        
        // If no file was uploaded, continue
        if (!req.file) return next();
        
        try {
          // Convert the uploaded file to PNG
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const outputFilename = `${uniqueSuffix}.png`;
          const outputPath = await convertToPng(req.file.path, outputFilename);
          
          // Update req.file with new path and mimetype
          req.file.originalPath = req.file.path;
          req.file.path = outputPath;
          req.file.filename = outputFilename;
          req.file.mimetype = 'image/png';
          
          next();
        } catch (error) {
          console.error('Image processing error:', error);
          next(error);
        }
      });
    };
  };
  
  return wrapper;
};

module.exports = {
  profileUpload: wrapWithPngConversion(profileUpload),
  ticketUpload: wrapWithPngConversion(ticketUpload)
};
