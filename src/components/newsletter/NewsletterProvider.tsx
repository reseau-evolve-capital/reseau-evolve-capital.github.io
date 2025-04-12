'use client';

import { createContext, useContext, useState, useEffect , useCallback} from 'react';
import { NewsletterPopup } from './NewsletterPopup';
import { newsletterConfig } from '@/config/newsletter-config';
import { type Locale } from '@/config/site-config';
import { usePathname } from 'next/navigation';

interface NewsletterContextType {
  showPopup: () => void;
  hidePopup: () => void;
}

const NewsletterContext = createContext<NewsletterContextType | undefined>(undefined);

export const useNewsletter = () => {
  const context = useContext(NewsletterContext);
  if (context === undefined) {
    throw new Error('useNewsletter must be used within a NewsletterProvider');
  }
  return context;
};

interface NewsletterProviderProps {
  children: React.ReactNode;
  locale: Locale;
}

export function NewsletterProvider({ children, locale }: NewsletterProviderProps) {
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();
console.log("isPopupVisible", isPopupVisible)
  // Check if we should display the popup on the current page
  const shouldDisplayOnCurrentPage = useCallback(() => {
    if (newsletterConfig.displayOnAllPages) return true;
    const currentPath = pathname || '';
    return newsletterConfig.displayOnPaths.some(path => currentPath.endsWith(path));
  }, [pathname]);

  // Check if we've shown the popup recently (based on localStorage)
  const hasShownRecently = () => {
    if (typeof window === 'undefined') return false;
    try {
      const lastDismissed = localStorage.getItem('newsletterLastDismissed');
      if (!lastDismissed) return false;
      
      const lastDismissedDate = new Date(JSON.parse(lastDismissed));
      const now = new Date();
      const daysDifference = Math.floor((now.getTime() - lastDismissedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysDifference < newsletterConfig.dismissedDuration;
    } catch {
      return false;
    }
  };

  // Initialize popup based on config and user history
  useEffect(() => {
    if (isInitialized) return;
    
    const initiatePopup = () => {
      // If we shouldn't display on this page, return
      if (!shouldDisplayOnCurrentPage()) return;
      
      // Check for localStorage preference
      if (hasShownRecently()) return;
      
      // If we're using sessionStorage check
      if (newsletterConfig.showOncePerSession) {
        const hasSeenPopup = sessionStorage.getItem('hasSeenNewsletterPopup');
        if (hasSeenPopup) return;
      }
      
      // Set a timer to show the popup
      const timer = setTimeout(() => {
        setIsPopupVisible(true);
      }, newsletterConfig.popupDelay * 1000);
      
      return () => clearTimeout(timer);
    };
    
    initiatePopup();
      setIsInitialized(true);
     
  }, [isInitialized, pathname, shouldDisplayOnCurrentPage]);

  const showPopup = () => {
    setIsPopupVisible(true);
  };

  const hidePopup = () => {
    setIsPopupVisible(false);
    
    // Mark as dismissed in sessionStorage
    if (newsletterConfig.showOncePerSession) {
      sessionStorage.setItem('hasSeenNewsletterPopup', 'true');
    }
    
    // Record dismissal time in localStorage for longer-term tracking
    try {
      localStorage.setItem('newsletterLastDismissed', JSON.stringify(new Date().toISOString()));
    } catch {
      // Ignore if localStorage is not available
    }
  };

  return (
    <NewsletterContext.Provider value={{ showPopup, hidePopup }}>
      {children}
      {isPopupVisible && (
        <NewsletterPopup
          locale={locale}
          delayTime={0} // No delay needed as we're managing this in the provider
        showOncePerSession={false} // We're handling this in the provider
        onClose={hidePopup}
        />
      )}
    </NewsletterContext.Provider>
  );
} 