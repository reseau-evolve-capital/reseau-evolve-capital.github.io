/**
 * Smoothly scrolls to an element with the specified ID
 * @param elementId The ID of the element to scroll to
 * @param offset Optional offset in pixels from the top of the element
 */
export const scrollToElement = (elementId: string, offset: number = 80): void => {
  // Remove the '#' if it's included in the elementId
  const targetId = elementId.startsWith('#') ? elementId.substring(1) : elementId;
  
  const element = document.getElementById(targetId);
  if (!element) return;

  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.scrollY - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth"
  });
};

/**
 * Handles click events for anchor links with smooth scrolling
 * @param e The click event
 * @param href The href attribute of the anchor
 * @returns boolean indicating if the event was handled
 */
export const handleAnchorClick = (e: React.MouseEvent, href: string): boolean => {
  if (href.startsWith('#')) {
    e.preventDefault();
    const elementId = href.substring(1);
    scrollToElement(elementId);
    // Update URL without full page reload
    window.history.pushState({}, '', href);
    return true;
  }
  
  if (href.includes('#') && (href.startsWith('/') || href.startsWith('.'))) {
    const hashIndex = href.indexOf('#');
    if (hashIndex !== -1) {
      const elementId = href.substring(hashIndex + 1);
      // Only handle if we're already on the right page
      const pagePath = href.substring(0, hashIndex);
      const currentPath = window.location.pathname;
      
      if (pagePath === '' || pagePath === '/' || currentPath.endsWith(pagePath)) {
        e.preventDefault();
        scrollToElement(elementId);
        // Update URL without full page reload
        window.history.pushState({}, '', href);
        return true;
      }
    }
  }
  
  return false;
}; 