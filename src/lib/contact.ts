import { type Locale } from '@/config/site-config';

// The URL of the deployed Google Apps Script for contact form
const CONTACT_API_URL = process.env.NEXT_PUBLIC_CONTACT_FORM_URL || '';

interface ContactFormResponse {
  status: 'success' | 'error';
  message: string;
  statusCode: number;
  timestamp: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  newsletter: boolean;
  locale: Locale;
  source?: string;
}

/**
 * Submits the contact form data to the Google Apps Script API
 * 
 * @param data The contact form data
 * @returns A promise that resolves to the API response
 */
export async function submitContactForm(data: ContactFormData): Promise<ContactFormResponse> {
  try {
    const response = await fetch(CONTACT_API_URL, {
      redirect: "follow",
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(data),
    });

    // Parse the JSON response
    const result = await response.json();
    
    return result as ContactFormResponse;
  } catch (error) {
    console.error('Error submitting contact form:', error);
    
    // Return a standardized error response
    return {
      status: 'error',
      message: 'Failed to connect to contact form service',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Validates the contact form data
 * 
 * @param data The contact form data to validate
 * @returns An object with validation results and any errors
 */
export function validateContactForm(data: Partial<ContactFormData>, locale: Locale): {
  isValid: boolean;
  errors: Partial<Record<keyof ContactFormData, string>>;
} {
  const errors: Partial<Record<keyof ContactFormData, string>> = {};
  
  // Validate name
  if (!data.name?.trim()) {
    errors.name = locale === 'fr' ? 'Le nom est requis' : 'Name is required';
  }
  
  // Validate email
  if (!data.email?.trim()) {
    errors.email = locale === 'fr' ? 'L\'email est requis' : 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = locale === 'fr' ? 'L\'email est invalide' : 'Email is invalid';
  }
  
  // Validate subject
  if (!data.subject) {
    errors.subject = locale === 'fr' ? 'Veuillez sélectionner un sujet' : 'Please select a subject';
  }
  
  // Validate message
  if (!data.message?.trim()) {
    errors.message = locale === 'fr' ? 'Le message est requis' : 'Message is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
} 