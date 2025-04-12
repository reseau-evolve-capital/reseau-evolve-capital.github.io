export const newsletterConfig = {
  // Popup display timing in seconds
  popupDelay: 15,
  
  // If true, only shows popup once per session
  showOncePerSession: true,
  
  // If true, displays popup on all pages; if false, only on specific pages
  displayOnAllPages: true,
  
  // Specific page paths to show popup on (if displayOnAllPages is false)
  displayOnPaths: ['/', '/about'],
  
  // Time to wait before showing popup again if dismissed (in days)
  // (used when localStorage is available)
  dismissedDuration: 7,
  
  // Colors for the popup (matches brand colors)
  colors: {
    primary: '#F3903F',
    secondary: '#FFF33B',
    accent: '#E93E3A',
    dark: '#231F20',
    light: '#FFFFFF',
  }
}; 