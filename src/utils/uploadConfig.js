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

// Configure storage for the initial upload
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
    // Store with .tmp extension initially
    cb(null, `${uniqueSuffix}.tmp`);
  }
});

// Extended file filter to accept more image formats
const fileFilter = (req, file, cb) => {
  // Accept all common image formats including HEIC from iOS
  const acceptedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/heic', 'image/heif', // iOS formats
    'image/bmp', 'image/tiff', 'image/svg+xml'
  ];

  // Also accept anything starting with 'image/'
  if (acceptedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    console.log(`Accepting file: ${file.originalname} (${file.mimetype})`);
    cb(null, true);
  } else {
    console.log(`Rejecting file: ${file.originalname} (${file.mimetype})`);
    cb(new Error(`Only image files are allowed. Got: ${file.mimetype}`), false);
  }
};

// Create multer instances with the basic configuration
const createMulter = (fileSize) => {
  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: fileSize
    }
  });
};

// Process uploaded image with Sharp and convert to PNG
const processImage = async (file) => {
  if (!file) {
    throw new Error('No file provided for processing');
  }

  console.log(`Processing file: ${file.path}`);
  const fileDir = path.dirname(file.path);
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const outputFilename = `${uniqueSuffix}.png`;
  const outputPath = path.join(fileDir, outputFilename);

  try {
    // Use Sharp to convert to PNG with enhanced error handling
    await sharp(file.path, { failOn: 'none' }) // 'none' helps handle corrupt images better
      .png({ quality: 90 })
      .toFile(outputPath);
    
    // Delete original temp file
    fs.unlink(file.path, err => {
      if (err) console.error(`Error deleting temp file ${file.path}:`, err);
    });
    
    // Return info about the processed file
    return {
      filename: outputFilename,
      path: outputPath,
      mimetype: 'image/png'
    };
  } catch (error) {
    console.error('Sharp image processing error:', error);
    
    // If Sharp fails, try a simple file copy as fallback
    const newPath = path.join(fileDir, `${uniqueSuffix}-unprocessed.png`);
    try {
      fs.copyFileSync(file.path, newPath);
      return {
        filename: path.basename(newPath),
        path: newPath,
        mimetype: 'image/png'
      };
    } catch (copyError) {
      console.error('Fallback copy also failed:', copyError);
      throw error; // Re-throw the original error
    }
  }
};

// Create middleware wrappers for the different types
const profileUpload = {
  single: (fieldName) => {
    const upload = createMulter(5 * 1024 * 1024); // 5MB limit
    
    return async (req, res, next) => {
      upload.single(fieldName)(req, res, async (err) => {
        if (err) {
          console.error('Multer error:', err);
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File size too large (max 5MB)'
            });
          }
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }
        
        // If no file was uploaded, continue
        if (!req.file) {
          return next();
        }
        
        try {
          // Process the image with Sharp
          const processedFile = await processImage(req.file);
          
          // Update the file info in req.file
          req.file.originalPath = req.file.path;
          req.file.path = processedFile.path;
          req.file.filename = processedFile.filename;
          req.file.mimetype = processedFile.mimetype;
          
          next();
        } catch (error) {
          console.error('Image processing error:', error);
          return res.status(500).json({
            success: false,
            message: 'Error processing uploaded image'
          });
        }
      });
    };
  }
};

const ticketUpload = {
  single: (fieldName) => {
    const upload = createMulter(10 * 1024 * 1024); // 10MB limit
    
    return async (req, res, next) => {
      upload.single(fieldName)(req, res, async (err) => {
        if (err) {
          console.error('Multer error:', err);
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File size too large (max 10MB)'
            });
          }
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }
        
        // If no file was uploaded, continue
        if (!req.file) {
          return next();
        }
        
        try {
          // Process the image with Sharp
          const processedFile = await processImage(req.file);
          
          // Update the file info in req.file
          req.file.originalPath = req.file.path;
          req.file.path = processedFile.path;
          req.file.filename = processedFile.filename;
          req.file.mimetype = processedFile.mimetype;
          
          next();
        } catch (error) {
          console.error('Image processing error:', error);
          return res.status(500).json({
            success: false,
            message: 'Error processing uploaded image'
          });
        }
      });
    };
  }
};

module.exports = {
  profileUpload,
  ticketUpload
};
