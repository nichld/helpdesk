const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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

// Helper function to check if file is HEIC/HEIF format
const isHeicImage = (mimetype, originalname) => {
  return mimetype === 'image/heic' || 
         mimetype === 'image/heif' || 
         originalname.toLowerCase().endsWith('.heic') || 
         originalname.toLowerCase().endsWith('.heif');
};

// Helper function to convert HEIC to PNG using heif-convert
const convertHeicToPng = async (inputPath, outputPath) => {
  try {
    console.log(`Converting HEIC image: ${inputPath} to ${outputPath}`);
    
    // Try heif-convert first (from libheif-examples)
    try {
      await execAsync(`heif-convert "${inputPath}" "${outputPath}"`);
      console.log('HEIC conversion successful with heif-convert');
      return true;
    } catch (heifError) {
      console.log('heif-convert failed:', heifError.stack || heifError);
      console.log('Trying fallback with ImageMagick...');
      
      // If heif-convert fails, try ImageMagick
      try {
        await execAsync(`convert "${inputPath}" "${outputPath}"`);
        console.log('HEIC conversion successful with ImageMagick');
        return true;
      } catch (imagemagickError) {
        console.log('ImageMagick failed:', imagemagickError.message);
        throw new Error('All conversion methods failed');
      }
    }
  } catch (error) {
    console.error('HEIC conversion error:', error);
    return false;
  }
};

// Configure storage for the initial upload
const storage = multer.memoryStorage({
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
    
    // Keep original extension for debugging, will convert later if needed
    const originalExt = path.extname(file.originalname) || '.tmp';
    cb(null, `${uniqueSuffix}${originalExt}`);
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

  // Check if mimetype is accepted or if file extension suggests image
  if (acceptedTypes.includes(file.mimetype) || 
      file.mimetype.startsWith('image/') || 
      isHeicImage(file.mimetype, file.originalname)) {
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

  console.log(`Processing file: ${file.path}, mimetype: ${file.mimetype}`);
  const fileDir = path.dirname(file.path);
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const outputFilename = `${uniqueSuffix}.png`;
  const outputPath = path.join(fileDir, outputFilename);

  try {
    // Check if this is a HEIC/HEIF image that needs special conversion
    if (isHeicImage(file.mimetype, file.originalname)) {
      console.log('HEIC/HEIF image detected, using special conversion');
      
      // Convert HEIC to PNG using external tools
      const conversionSuccess = await convertHeicToPng(file.path, outputPath);
      
      if (!conversionSuccess) {
        throw new Error('Failed to convert HEIC image');
      }
    } else {
      console.log('Checking file existence:', fs.existsSync(file.path), file.path);
      // Use Sharp for standard image formats
      await sharp(file.path, { failOn: 'none' })
        .png({ quality: 90 })
        .toFile(outputPath);
    }
    
    // Delete original temp file
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      console.error(`Error deleting temp file ${file.path}:`, err);
    }
    
    // Return info about the processed file
    return {
      filename: outputFilename,
      path: outputPath,
      mimetype: 'image/png'
    };
  } catch (error) {
    console.error('Image processing error:', error.stack || error);
    
    // If conversion fails, try a simple file copy as fallback
    try {
      const newPath = path.join(fileDir, `${uniqueSuffix}-fallback.png`);
      fs.copyFileSync(file.path, newPath);
      return {
        filename: path.basename(newPath),
        path: newPath,
        mimetype: 'image/png'
      };
    } catch (copyError) {
      console.error('Fallback copy also failed:', copyError.stack || copyError);
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
          console.error('Unexpected Multer error:', err.stack || err);
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
          console.error('Unexpected Multer error:', err.stack || err);
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
