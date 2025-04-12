# Contact Form Integration for Réseau Evolve Capital

This document provides instructions for setting up the contact form backend for the Réseau Evolve Capital website. The system utilizes Google Apps Script as a backend API, stores submissions in a Google Sheet, and optionally integrates with Brevo for lead management.

## Overview

The contact form system consists of:

1. A Google Sheet to store contact form submissions
2. A Google Apps Script that serves as an API endpoint
3. Website integration with the contact form component
4. Email notifications to administrators
5. Optional Brevo integration for lead management

## Setup Instructions

### 1. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Rename the first sheet to "Contact Submissions"
3. Add the following headers to the first row:
   - Timestamp
   - Name
   - Email
   - Subject
   - Message
   - Newsletter Opt-in
   - Language
   - Source
4. Format the header row (optional but recommended)
5. Note the Spreadsheet ID from the URL (the long string between `/d/` and `/edit` in the URL)

### 2. Set Up Google Apps Script

1. In your Google Sheet, go to **Extensions** > **Apps Script**
2. Replace the default code in the editor with the contents of the `contact.js` file
3. Update the configuration section at the top of the script:
   ```javascript
   const CONFIG = {
     // Google Sheets Configuration
     SPREADSHEET_ID: "YOUR_SPREADSHEET_ID_HERE", // Use the ID from step 1.5
     SHEET_NAME: "Contact Submissions",

     // Brevo API Configuration
     BREVO_API_KEY: "YOUR_BREVO_API_KEY_HERE",
     BREVO_LIST_ID: 2, // Update with your list ID from Brevo
     
     // Notification Email Configuration
     ENABLE_ADMIN_NOTIFICATION: true,
     ADMIN_EMAIL: "contact@reseauevolvecapital.com", // Update with your email
     
     // Other settings as needed...
   };
   ```
4. Click **Save** and give your project a name (e.g., "Contact Form API")

### 3. Deploy the Google Apps Script as a Web App

1. Click on **Deploy** > **New deployment**
2. Select **Web app** as the deployment type
3. Configure the deployment:
   - Description: "Contact Form API"
   - Execute as: "Me"
   - Who has access: "Anyone" (for public access)
4. Click **Deploy**
5. Copy the Web app URL that appears (you'll need this for the website integration)

### 4. Set Up Brevo Integration (Optional)

1. Sign up for a [Brevo account](https://www.brevo.com/) if you don't already have one
2. Create a contacts list for form submissions (separate from your newsletter list)
3. Go to **SMTP & API** under your account settings
4. Create or copy an existing API key
5. Update the Google Apps Script with your Brevo API key and list ID

### 5. Configure the Website

1. Add the contact form API URL to your environment variables:
   - Create or update `.env.local` in your project root
   - Add the following line:
     ```
     NEXT_PUBLIC_CONTACT_FORM_URL="YOUR_DEPLOYED_SCRIPT_URL_HERE"
     ```

2. The contact form component is already configured to use this API through the `src/lib/contact.ts` utility

### 6. Testing the Integration

1. In the Google Apps Script editor, run the `testContactFormSubmission` function:
   ```javascript
   function testContactFormSubmission() {
     const testData = {
       name: "Test User",
       email: "test@example.com",
       subject: "request-information",
       message: "This is a test message from the contact form.",
       newsletter: true,
       locale: "fr"
     };
     
     const mockEvent = {
       postData: {
         contents: JSON.stringify(testData)
       }
     };
     
     const response = handleContactFormSubmission(mockEvent);
     console.log("Test Response: ", response);
   }
   ```
2. Check that a new entry appears in your Google Sheet
3. Verify that you received an email notification (if enabled)
4. Test the contact form on the website to ensure it connects properly to the API

## Understanding the Code

### Google Apps Script (`contact.js`)

The script handles several tasks:

1. **Processing Form Submissions**: Validates and processes incoming form data
2. **Data Storage**: Records submissions in the Google Sheet with timestamps
3. **Admin Notifications**: Sends email notifications about new submissions
4. **Brevo Integration**: Adds contacts to your CRM system
5. **Newsletter Opt-in**: If enabled, adds the contact to your newsletter list

### Website Integration

The contact form integration consists of:

1. **TypeScript Utility**: `src/lib/contact.ts` provides functions to submit and validate form data
2. **React Component**: `ContactFormSection.tsx` uses the utility to handle form submissions

## Features

The contact form system includes several features:

1. **Bilingual Support**: Handles responses in both French and English
2. **Form Validation**: Client-side and server-side validation of form fields
3. **Spam Protection**: Basic rate limiting to prevent abuse
4. **CORS Protection**: Security against unauthorized access
5. **Formatted Notifications**: Well-formatted email notifications for administrators
6. **Newsletter Integration**: Optional newsletter signup during contact submission
7. **Error Handling**: Comprehensive error handling and reporting

## Security Considerations

- The contact form API is publicly accessible, which is necessary for form submissions
- Basic security measures like rate limiting and CORS protection are included
- Consider implementing additional security like reCAPTCHA if spam becomes an issue
- Ensure your API keys remain confidential

## Maintenance

- Periodically check the Google Sheet for new submissions
- Clear out old submissions to maintain sheet performance
- Update the API key if you need to change it in Brevo
- Monitor for any errors in the Google Apps Script logs

---

For any questions or issues, please contact the website administrator. 