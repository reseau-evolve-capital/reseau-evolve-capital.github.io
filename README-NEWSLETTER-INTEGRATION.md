# Newsletter Integration for Réseau Evolve Capital

This document provides instructions for setting up the newsletter subscription system for the Réseau Evolve Capital website. The system utilizes Google Apps Script as a backend API and integrates with Brevo (formerly Sendinblue) for email marketing.

## Overview

The newsletter system consists of:

1. A Google Sheet to store subscriber information
2. A Google Apps Script that serves as an API endpoint
3. Website integration with the newsletter popup component
4. Brevo integration for managing email marketing campaigns

## Setup Instructions

### 1. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Rename the sheet to "Subscribers"
3. Add the following headers to the first row:
   - Date
   - Email
   - Name
   - Source
   - Status
4. Format the header row (optional but recommended)
5. Note the Spreadsheet ID from the URL (the long string between `/d/` and `/edit` in the URL)

### 2. Set Up Google Apps Script

1. In your Google Sheet, go to **Extensions** > **Apps Script**
2. Replace the default code in the editor with the contents of the `newsletter.js` file
3. Update the configuration section at the top of the script:
   ```javascript
   const CONFIG = {
     // Google Sheets Configuration
     SPREADSHEET_ID: "YOUR_SPREADSHEET_ID_HERE", // Use the ID from step 1.5
     SHEET_NAME: "Subscribers",

     // Brevo API Configuration
     BREVO_API_KEY: "YOUR_BREVO_API_KEY_HERE",
     BREVO_LIST_ID: 1, // Update with your list ID from Brevo
     
     // Other settings as needed...
   };
   ```
4. Click **Save** and give your project a name (e.g., "Newsletter API")

### 3. Deploy the Google Apps Script as a Web App

1. Click on **Deploy** > **New deployment**
2. Select **Web app** as the deployment type
3. Configure the deployment:
   - Description: "Newsletter Subscription API"
   - Execute as: "Me"
   - Who has access: "Anyone" (for public access) or "Anyone with Google Account" (more secure)
4. Click **Deploy**
5. Copy the Web app URL that appears (you'll need this for the website integration)

### 4. Set Up Brevo Integration

1. Sign up for a [Brevo account](https://www.brevo.com/) if you don't already have one
2. Create a contact list for newsletter subscribers
3. Go to **SMTP & API** under your account settings
4. Create or copy an existing API key
5. Update the Google Apps Script with your Brevo API key and list ID

### 5. Configure the Website

1. Open the `src/lib/newsletter.ts` file in your website codebase
2. Replace the placeholder API URL with your deployed Google Apps Script URL:
   ```typescript
   const NEWSLETTER_API_URL = 'YOUR_DEPLOYED_SCRIPT_URL_HERE';
   ```

### 6. Testing the Integration

1. In the Google Apps Script editor, add a test function:
   ```javascript
   function testNewsletterSubscription() {
     const testData = {
       email: "test@example.com",
       name: "Test User",
       locale: "en",
       source: "test"
     };
     
     const mockEvent = {
       postData: {
         contents: JSON.stringify(testData)
       }
     };
     
     const response = handleNewsletterSubscription(mockEvent);
     console.log("Test Response: ", response);
   }
   ```
2. Run this function to test the Google Sheet and Brevo integration
3. On your website, test the newsletter signup form to ensure it connects properly to the API

## Understanding the Code

### Google Apps Script (`newsletter.js`)

- The script handles incoming POST requests from the website
- It validates email addresses and checks for duplicates
- Subscriber information is recorded in the Google Sheet
- New contacts are added to Brevo for email marketing
- The script includes security measures like CORS protection and rate limiting

### Website Integration

- The `src/lib/newsletter.ts` file provides a utility function to communicate with the API
- The `NewsletterPopup` component uses this utility to handle form submissions
- The popup displays appropriate success or error messages based on the API response

## Troubleshooting

### Common Issues

1. **CORS Errors**: If you see CORS errors in the browser console, verify that your website domain is included in the `ALLOWED_DOMAINS` configuration in the Google Apps Script.

2. **API Key Issues**: If contacts aren't being added to Brevo, check that your API key is correct and has proper permissions.

3. **Quota Limits**: Google Apps Script has usage quotas. If you're experiencing issues with high traffic, consider implementing a more robust backend solution.

### Debugging

- Check the Google Apps Script logs by going to **View** > **Logs** in the Apps Script editor
- Use browser developer tools to monitor network requests and responses
- Test the API directly using tools like Postman or curl

## Security Considerations

- The current implementation includes basic security measures like CORS protection and rate limiting
- For higher security, consider adding authentication to the API
- Regularly audit the Google Sheet for unusual activity
- Monitor your Brevo account for unexpected usage

## Maintenance

- Periodically check the Google Apps Script logs for errors
- Update the Brevo API key if it expires or is compromised
- Back up the subscriber list regularly

---

For any questions or issues, please contact the website administrator. 