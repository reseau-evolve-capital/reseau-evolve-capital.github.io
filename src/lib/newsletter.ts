import { type Locale } from '@/config/site-config';

// The URL of the deployed Google Apps Script
const NEWSLETTER_API_URL = process.env.NEXT_PUBLIC_APP_SCRIPT_URL || '';

// Newsletter query parameter
export const NEWSLETTER_QUERY_PARAM = 'newsletter';

interface NewsletterSubscriptionResponse {
  success: boolean;
  message: string;
  statusCode: number;
  timestamp: string;
  alreadyRegistered?: boolean;
  brevoStatus?: 'success' | 'warning' | 'error';
  brevoMessage?: string;
}

interface NewsletterSubscriptionData {
  email: string;
  name?: string;
  locale: Locale;
  source?: string;
}

/**
 * Subscribes an email to the newsletter via the Google Apps Script API
 * 
 * @param data The subscription data containing email and optional fields
 * @returns A promise that resolves to the API response
 */
export async function subscribeToNewsletter(data: NewsletterSubscriptionData): Promise<NewsletterSubscriptionResponse> {
  try {
      const response = await fetch(NEWSLETTER_API_URL, {
      redirect: "follow",
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(data),
    });

    // Parse the JSON response
    const result = await response.json();
    
    return result as NewsletterSubscriptionResponse;
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    
    // Return a standardized error response
    return {
      success: false,
      message: 'Failed to connect to newsletter service',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Validates an email address format
 * 
 * @param email The email address to validate
 * @returns Boolean indicating if the email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generates a URL with the newsletter query parameter
 * This URL can be shared to directly open the newsletter popup
 * 
 * @param locale The current locale
 * @param path Optional path to include in the URL (defaults to homepage)
 * @param baseUrl Optional base URL (defaults to the current domain)
 * @returns A URL string that will trigger the newsletter popup when visited
 */
export function generateNewsletterShareUrl(locale: Locale, path?: string, baseUrl?: string): string {
  // If we're in a browser environment, use the current domain if baseUrl is not provided
  const base = baseUrl || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '');
  
  // Use the provided path or default to the homepage for the current locale
  const pagePath = path || `/${locale}`;
  
  // Normalize path to ensure it starts with a slash
  const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
  
  // Construct the URL with the newsletter query parameter
  return `${base}${normalizedPath}?${NEWSLETTER_QUERY_PARAM}=true`;
} 