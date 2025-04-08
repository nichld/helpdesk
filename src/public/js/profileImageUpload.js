/**
 * Profile Image Upload Handler
 * Provides functionality for uploading, taking photos, and managing profile images
 */
document.addEventListener('DOMContentLoaded', function() {
  // Feature detection
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasBlobConstructor = 'Blob' in window;
  const hasFormData = 'FormData' in window;
  const hasFileReader = 'FileReader' in window;
  
  // DOM elements
  const avatarModal = document.getElementById('avatar-modal');
  const cameraModal = document.getElementById('camera-modal');
  const changeAvatarBtn = document.getElementById('change-avatar-btn');
  const cancelAvatarBtn = document.getElementById('cancel-avatar-btn');
  const saveAvatarBtn = document.getElementById('save-avatar-btn');
  const browseImageBtn = document.getElementById('browse-image-btn');
  const uploadPhotoBtn = document.getElementById('upload-photo-btn');
  const modalCameraBtn = document.getElementById('modal-camera-btn');
  const cameraSection = document.getElementById('camera-section');
  const closeCameraBtn = document.getElementById('close-camera-btn');
  const switchCameraBtn = document.getElementById('switch-camera-btn');
  const capturePhotoBtn = document.getElementById('capture-photo-btn');
  const avatarUrlInput = document.getElementById('avatarUrl');
  const profileImageInput = document.getElementById('profileImage');
  const fileInput = document.getElementById('file-input');
  const profilePreview = document.getElementById('profile-preview');
  const profileImageContainer = document.getElementById('profile-image-container');
  const loadingOverlay = document.getElementById('loading-overlay');
  const cameraStream = document.getElementById('camera-stream');
  const cameraCanvas = document.getElementById('camera-canvas');
  
  // Handle browsers without camera support
  if (!hasGetUserMedia || !hasBlobConstructor) {
    // Hide camera options if the browser doesn't support getUserMedia
    if (cameraSection) cameraSection.style.display = 'none';
    if (modalCameraBtn) modalCameraBtn.style.display = 'none';
  }
  
  // Camera variables
  let stream = null;
  let facingMode = 'user'; // Default to front camera
  
  // Show avatar modal
  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', function() {
      avatarModal.classList.remove('hidden');
    });
  }
  
  // Hide avatar modal
  if (cancelAvatarBtn) {
    cancelAvatarBtn.addEventListener('click', function() {
      avatarModal.classList.add('hidden');
    });
  }
  
  // Save URL from the modal
  if (saveAvatarBtn) {
    saveAvatarBtn.addEventListener('click', function() {
      const url = avatarUrlInput.value.trim();
      if (url) {
        profileImageInput.value = url;
        updateProfilePreview(url);
      }
      avatarModal.classList.add('hidden');
    });
  }
  
  // Open file dialog when browse button is clicked
  if (browseImageBtn) {
    browseImageBtn.addEventListener('click', function() {
      fileInput.click();
    });
  }
  
  // Open file dialog when upload button in modal is clicked
  if (uploadPhotoBtn) {
    uploadPhotoBtn.addEventListener('click', function() {
      fileInput.click();
    });
  }
  
  // Handle file selection
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        handleFileUpload(this.files[0]);
      }
    });
  }
  
  // Open camera modal from avatar modal
  if (modalCameraBtn && hasGetUserMedia) {
    modalCameraBtn.addEventListener('click', function() {
      avatarModal.classList.add('hidden');
      startCamera();
    });
  }
  
  // Close camera modal
  if (closeCameraBtn) {
    closeCameraBtn.addEventListener('click', function() {
      stopCamera();
      cameraModal.classList.add('hidden');
    });
  }
  
  // Switch between front and back cameras
  if (switchCameraBtn) {
    switchCameraBtn.addEventListener('click', function() {
      facingMode = facingMode === 'user' ? 'environment' : 'user';
      stopCamera();
      startCamera();
    });
  }
  
  // Capture photo button
  if (capturePhotoBtn) {
    capturePhotoBtn.addEventListener('click', function() {
      capturePhoto();
    });
  }
  
  // Start camera function
  function startCamera() {
    if (!cameraModal || !hasGetUserMedia) return;
    
    cameraModal.classList.remove('hidden');
    
    // Get the proper camera based on facingMode
    navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    })
    .then(function(mediaStream) {
      stream = mediaStream;
      cameraStream.srcObject = mediaStream;
    })
    .catch(function(error) {
      console.error('Error accessing camera:', error);
      showError('Unable to access camera: ' + error.message);
      cameraModal.classList.add('hidden');
    });
  }
  
  // Stop camera function
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      stream = null;
    }
  }
  
  // Capture photo function
  function capturePhoto() {
    if (!stream || !cameraCanvas) return;
    
    const context = cameraCanvas.getContext('2d');
    
    // Set canvas dimensions to video dimensions
    cameraCanvas.width = cameraStream.videoWidth;
    cameraCanvas.height = cameraStream.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(cameraStream, 0, 0, cameraCanvas.width, cameraCanvas.height);
    
    // Convert to blob
    cameraCanvas.toBlob(function(blob) {
      // Close camera
      stopCamera();
      cameraModal.classList.add('hidden');
      
      // Upload the captured photo
      handleFileUpload(blob);
    }, 'image/jpeg', 0.9);
  }
  
  // Handle file upload
  function handleFileUpload(file) {
    if (!hasFormData || !file) {
      showError('This browser does not support file uploads');
      return;
    }
    
    // Show loading
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    
    // Create form data
    const formData = new FormData();
    formData.append('profileImage', file);
    
    // Send to server
    fetch('/profile/upload-image', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
      
      if (data.success) {
        // Update profile image and input field
        profileImageInput.value = data.profileImage;
        updateProfilePreview(data.profileImage);
        if (avatarModal) avatarModal.classList.add('hidden');
      } else {
        showError('Error uploading image: ' + (data.message || 'Unknown error'));
      }
    })
    .catch(error => {
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
      console.error('Error:', error);
      showError('An error occurred while uploading the image');
    });
  }
  
  // Update profile preview
  function updateProfilePreview(imageUrl) {
    if (!profileImageContainer) return;
    
    if (!profilePreview) {
      // Create new image element if it doesn't exist
      const newImg = document.createElement('img');
      newImg.id = 'profile-preview';
      newImg.alt = 'Profile';
      newImg.className = 'w-full h-full object-cover';
      newImg.src = imageUrl;
      
      // Clear container and append new image
      profileImageContainer.innerHTML = '';
      profileImageContainer.appendChild(newImg);
    } else {
      // Update existing image
      profilePreview.src = imageUrl;
    }
  }
  
  // Helper to show error messages with improved styling
  function showError(message) {
    // Create a toast-style notification instead of using alert
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-white border border-red-200 shadow-lg rounded-lg p-4 z-50 flex items-center';
    toast.innerHTML = `
      <div class="text-red-600 mr-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="text-sm text-gray-800">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 5 seconds
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }
});
