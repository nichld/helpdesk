// Global toast notification function
window.showToast = function(message, type = 'info') {
  console.log(`Showing toast: ${message} (${type})`);
  
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-3';
    document.body.appendChild(toastContainer);
  }
  
  // Set toast styles based on type
  let bgColor, textColor, borderColor, iconColor, icon;
  
  switch(type) {
    case 'success':
      bgColor = 'bg-green-50';
      textColor = 'text-green-800';
      borderColor = 'border-green-200';
      iconColor = 'text-green-500';
      icon = '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />';
      break;
    case 'error':
      bgColor = 'bg-red-50';
      textColor = 'text-red-800';
      borderColor = 'border-red-200';
      iconColor = 'text-red-500';
      icon = '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />';
      break;
    case 'warning':
      bgColor = 'bg-yellow-50';
      textColor = 'text-yellow-800';
      borderColor = 'border-yellow-200';
      iconColor = 'text-yellow-500';
      icon = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />';
      break;
    default: // info
      bgColor = 'bg-blue-50';
      textColor = 'text-blue-800';
      borderColor = 'border-blue-200';
      iconColor = 'text-blue-500';
      icon = '<path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />';
      break;
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `${bgColor} border ${borderColor} ${textColor} px-4 py-3 rounded-md shadow-md flex items-center gap-3 min-w-[18rem] max-w-sm transition-opacity duration-300`;
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="${iconColor} flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${icon}
    </svg>
    <p class="text-sm">${message}</p>
    <button class="ml-auto text-gray-500 hover:text-gray-700" aria-label="Close">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18"></path>
        <path d="m6 6 12 12"></path>
      </svg>
    </button>
  `;
  
  // Add close button functionality
  const closeButton = toast.querySelector('button');
  closeButton.addEventListener('click', () => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
      // Remove container if empty
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  });
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (toast.isConnected) { // Check if toast is still in the DOM
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.isConnected) toast.remove();
        // Remove container if empty
        if (toastContainer.isConnected && toastContainer.children.length === 0) {
          toastContainer.remove();
        }
      }, 300);
    }
  }, 5000);
};
