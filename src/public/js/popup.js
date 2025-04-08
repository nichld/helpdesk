document.addEventListener('DOMContentLoaded', () => {
  const popup = document.getElementById('message-popup');
  const closeButton = document.getElementById('popup-close');
  
  if (popup) {
    console.log('Popup found:', popup);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      dismissPopup();
    }, 5000);
    
    // Close button handler
    if (closeButton) {
      closeButton.addEventListener('click', dismissPopup);
    }
  } else {
    console.log('No popup found on page');
  }
  
  function dismissPopup() {
    if (popup) {
      popup.style.opacity = '0';
      setTimeout(() => {
        popup.remove();
      }, 300);
    }
  }
});
