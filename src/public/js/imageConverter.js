/**
 * Image conversion utility for client-side processing
 * Converts any image format (including HEIC/HEIF from iOS) to PNG before upload
 */

const ImageConverter = {
  /**
   * Convert any image file to PNG format
   * @param {File} file - The original file object from input
   * @param {Object} options - Conversion options
   * @param {number} options.maxWidth - Maximum width (default: 1920)
   * @param {number} options.maxHeight - Maximum height (default: 1080)
   * @param {number} options.quality - JPEG quality 0-1 (default: 0.9)
   * @returns {Promise<File>} A new File object containing PNG data
   */
  convertToPng: async function(file, options = {}) {
    if (!file) throw new Error('No file provided');
    
    // Log original file details
    console.log(`Converting file: ${file.name} (${file.type}), size: ${file.size} bytes`);
    
    const maxWidth = options.maxWidth || 1920;
    const maxHeight = options.maxHeight || 1080;
    const quality = options.quality || 0.9;
    
    // Create a unique filename
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 10);
    const newFilename = `image-${timestamp}-${randomString}.png`;

    try {
      // Special handling for HEIC/HEIF images from iOS
      if (file.type === 'image/heic' || file.type === 'image/heif' || 
          file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        console.log('HEIC/HEIF format detected, using specialized conversion');
        
        // Try to dynamically load the heic2any library if needed
        if (typeof heic2any === 'undefined') {
          console.log('Loading heic2any library dynamically');
          await loadScript('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js');
        }
        
        if (typeof heic2any !== 'undefined') {
          console.log('Using heic2any for conversion');
          const blob = await heic2any({
            blob: file,
            toType: 'image/png'
          });
          
          // Convert to standard format
          return await this.resizeAndOptimize(blob, newFilename, maxWidth, maxHeight, quality);
        } else {
          console.warn('heic2any library not available, falling back to canvas conversion');
        }
      }
      
      // Standard conversion for all other image types
      return await this.resizeAndOptimize(file, newFilename, maxWidth, maxHeight, quality);
      
    } catch (error) {
      console.error('Image conversion error:', error);
      // If conversion fails, return the original file as fallback
      return file;
    }
  },
  
  /**
   * Resize and optimize an image using canvas
   * @param {Blob|File} fileOrBlob - The image file or blob
   * @param {string} filename - The output filename
   * @param {number} maxWidth - Maximum width
   * @param {number} maxHeight - Maximum height
   * @param {number} quality - Output quality
   * @returns {Promise<File>} A new File object with the converted image
   */
  resizeAndOptimize: async function(fileOrBlob, filename, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        const img = new Image();
        
        img.onload = function() {
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          // Create canvas and draw image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to PNG
          canvas.toBlob(function(blob) {
            const convertedFile = new File([blob], filename, {
              type: 'image/png',
              lastModified: new Date().getTime()
            });
            
            console.log(`Conversion complete: ${filename} (${convertedFile.size} bytes)`);
            resolve(convertedFile);
          }, 'image/png', quality);
        };
        
        img.onerror = function() {
          console.error('Error loading image for conversion');
          reject(new Error('Failed to load image for conversion'));
        };
        
        img.src = e.target.result;
      };
      
      reader.onerror = function() {
        console.error('Error reading file');
        reject(new Error('Failed to read file for conversion'));
      };
      
      reader.readAsDataURL(fileOrBlob);
    });
  }
};

/**
 * Dynamically load a script
 * @param {string} src - Script URL
 * @returns {Promise} Resolves when script is loaded
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Make available globally
window.ImageConverter = ImageConverter;
