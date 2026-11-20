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

