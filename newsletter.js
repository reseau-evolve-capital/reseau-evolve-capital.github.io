// ====================================================================================================
// NEWSLETTER SUBSCRIPTION MANAGER FOR RÉSEAU EVOLVE CAPITAL
// ====================================================================================================
// This script handles the following:
// 1. Receiving and validating email submissions from the website
// 2. Recording subscriptions in a Google Sheet with timestamps
// 3. Adding contacts to Brevo (formerly Sendinblue) for email marketing
// 4. Providing appropriate response messages in both French and English
// ====================================================================================================

// Configuration Constants - CUSTOMIZE THESE VALUES
const CONFIG = {
    // Google Sheets Configuration
    SPREADSHEET_ID: "1x-zlw8jqgiiIoiRBjO8WlmIh7N8vvsNPpdYLCxdeMjk", // ID of the Google Sheet to save subscriptions
    SHEET_NAME: "Subscribers", // Name of the sheet tab
  
    // Brevo API Configuration
    BREVO_API_KEY: "xkeysib", // Your Brevo API key
    BREVO_LIST_ID: 4, // The ID of your contact list in Brevo (change as needed)
    
    // Response Configuration
    ENABLE_EMAIL_CONFIRMATION: true, // Set to true to send confirmation emails to new subscribers
    
    // Email Templates (if confirmation enabled)
    EMAIL_SENDER: {
      email: "contact@reseauevolvecapital.com",
      name: "Réseau Evolve Capital"
    },
    
    // CORS Configuration - Allowed domains
    ALLOWED_DOMAINS: [
      "reseauevolvecapital.com",
      "www.reseauevolvecapital.com"
    ],
    
    // Security 
    ENABLE_RATE_LIMITING: true, // Enable basic protection against abuse
    MAX_DAILY_SUBMISSIONS: 1000 // Maximum number of submissions per day
  };
  
  // ====================================================================================================
  // MAIN FUNCTIONS
  // ====================================================================================================
  
  /**
   * Main entry point for POST requests
   */
  function doPost(e) {
    try {
      // Set CORS headers for pre-flight requests
      if (e.parameter.method === "OPTIONS") {
        return handleCorsPreFlight();
      }
      
      // Process the request
      return handleNewsletterSubscription(e);
    } catch (error) {
      console.error("Error in doPost: ", error);
      return createErrorResponse("Server error occurred", 500);
    }
  }
  
  /**
   * Handle incoming newsletter subscription
   */
  function handleNewsletterSubscription(e) {
    // Validate request
    if (!e.postData || !e.postData.contents) {
      return createErrorResponse("No data provided", 400);
    }
    
    try {
      // Parse the request data
      const requestData = JSON.parse(e.postData.contents);
      
      // Check origin if relevant
      if (e.parameter && e.parameter.origin) {
        if (!isAllowedOrigin(e.parameter.origin)) {
          return createErrorResponse("Unauthorized origin", 403);
        }
      }
      
      // Check for rate limiting
      if (CONFIG.ENABLE_RATE_LIMITING && isRateLimitExceeded()) {
        return createErrorResponse("Rate limit exceeded", 429);
      }
      
      // Validate email
      const email = requestData.email;
      if (!email || !isValidEmail(email)) {
        return createErrorResponse("Invalid email address", 400);
      }
      
      // Get additional data if available
      const locale = requestData.locale || "fr";
      const source = requestData.source || "website";
      const name = requestData.name || "";
      
      // Check if email already exists
      if (isEmailAlreadyRegistered(email)) {
        return createSuccessResponse(
          locale === "fr" 
            ? "Cet email est déjà inscrit à notre newsletter" 
            : "This email is already registered to our newsletter",
          { alreadyRegistered: true }
        );
      }
      
      // Record in spreadsheet
      const spreadsheetResult = recordInSpreadsheet(email, name, source);
      if (!spreadsheetResult.success) {
        return createErrorResponse(spreadsheetResult.message, 500);
      }
      
      // Add to Brevo
      const brevoResult = addToBrevo(email, name, locale);
      
      // Send confirmation email if enabled
      if (CONFIG.ENABLE_EMAIL_CONFIRMATION) {
        sendConfirmationEmail(email, locale);
      }
      
      // Create response message based on locale
      const message = locale === "fr"
        ? "Merci de vous être inscrit à notre newsletter !"
        : "Thank you for subscribing to our newsletter!";
      
      return createSuccessResponse(message, { 
        brevoStatus: brevoResult.success ? "success" : "warning",
        brevoMessage: brevoResult.message
      });
      
    } catch (error) {
      console.error("Error processing subscription: ", error);
      return createErrorResponse("Failed to process subscription", 500);
    }
  }
  
  // ====================================================================================================
  // HELPER FUNCTIONS - GOOGLE SHEETS
  // ====================================================================================================
  
  /**
   * Records a new subscription in the Google Sheet
   */
  function recordInSpreadsheet(email, name = "", source = "website") {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      //const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      
      if (!sheet) {
        // Create the sheet if it doesn't exist
        const newSheet = ss.insertSheet(CONFIG.SHEET_NAME);
        newSheet.appendRow(["Date", "Email", "Name", "Source", "Status"]);
        newSheet.setFrozenRows(1);
        
        // Format the header row
        newSheet.getRange("A1:E1").setBackground("#F3903F")
                                  .setFontColor("#FFFFFF")
                                  .setFontWeight("bold");
        
        // Auto-resize columns
        newSheet.autoResizeColumns(1, 5);
      }
      
      // Add the new subscriber to the sheet
      const currentDate = new Date().toISOString();
      sheet.appendRow([currentDate, email, name, source, "Active"]);
      
      return { success: true };
    } catch (error) {
      console.error("Error recording in spreadsheet: ", error);
      return { success: false, message: "Failed to record in spreadsheet" };
    }
  }
  
  /**
   * Checks if an email is already registered in the sheet
   */
  function isEmailAlreadyRegistered(email) {
    try {
      //const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      //const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      
      if (!sheet) {
        return false; // Sheet doesn't exist, so email can't be registered
      }
      
      // Get all email data
      const dataRange = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1); // Column B (Email) starting from row 2
      const emails = dataRange.getValues().flat();
      
      // Case-insensitive search
      return emails.some(existingEmail => 
        existingEmail.toString().toLowerCase() === email.toLowerCase());
        
    } catch (error) {
      console.error("Error checking email existence: ", error);
      return false; // Assume not registered in case of error
    }
  }
  
  // ====================================================================================================
  // HELPER FUNCTIONS - BREVO INTEGRATION
  // ====================================================================================================
  
  /**
   * Add a contact to Brevo (formerly Sendinblue)
   */
  function addToBrevo(email, name = "", locale = "fr") {
    try {
      // Prepare request data for Brevo
      const brevoData = {
        email: email,
        attributes: {
          FIRSTNAME: name,
          WEBSITE_LOCALE: locale,
          SIGNUP_DATE: new Date().toISOString()
        },
        listIds: [CONFIG.BREVO_LIST_ID],
        updateEnabled: true, // Update the contact if it already exists
        // You can customize these fields as needed
        emailBlacklisted: false,
        smsBlacklisted: false
      };
      
      // Make the API request to Brevo
      const response = UrlFetchApp.fetch("https://api.brevo.com/v3/contacts", {
        method: "post",
        contentType: "application/json",
        headers: {
          "api-key": CONFIG.BREVO_API_KEY,
          "Accept": "application/json"
        },
        payload: JSON.stringify(brevoData),
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      const responseBody = response.getContentText();
      
      // Log complete response for debugging
      console.log("Brevo API Response Code: " + responseCode);
      console.log("Brevo API Response: " + responseBody);
      
      if (responseCode >= 200 && responseCode < 300) {
        return { success: true, message: "Contact added to Brevo successfully" };
      } else if (responseCode === 400 && responseBody.includes("Contact already exist")) {
        // Update the existing contact with the latest information
        return updateExistingBrevoContact(email, brevoData);
      } else {
        return { 
          success: false, 
          message: "Failed to add contact to Brevo: " + responseBody
        };
      }
    } catch (error) {
      console.error("Error adding contact to Brevo: ", error);
      return { success: false, message: "Failed to add contact to Brevo" };
    }
  }
  
  /**
   * Update an existing contact in Brevo
   */
  function updateExistingBrevoContact(email, contactData) {
    try {
      // Create payload for updating an existing contact
      const updateData = {
        attributes: contactData.attributes,
        listIds: contactData.listIds,
        emailBlacklisted: contactData.emailBlacklisted,
        smsBlacklisted: contactData.smsBlacklisted
      };
      
      // Make the API request to update the contact
      const response = UrlFetchApp.fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
        method: "put",
        contentType: "application/json",
        headers: {
          "api-key": CONFIG.BREVO_API_KEY,
          "Accept": "application/json"
        },
        payload: JSON.stringify(updateData),
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      
      if (responseCode >= 200 && responseCode < 300) {
        return { success: true, message: "Existing contact updated in Brevo" };
      } else {
        return { 
          success: false, 
          message: "Failed to update existing contact in Brevo"
        };
      }
    } catch (error) {
      console.error("Error updating contact in Brevo: ", error);
      return { success: false, message: "Failed to update contact in Brevo" };
    }
  }
  
  // ====================================================================================================
  // HELPER FUNCTIONS - EMAIL CONFIRMATION
  // ====================================================================================================
  
  /**
   * Send a confirmation email to the new subscriber
   */
  function sendConfirmationEmail(email, locale = "fr") {
    if (!CONFIG.ENABLE_EMAIL_CONFIRMATION) return;
    
    try {
      // Determine subject and content based on locale
      const subject = locale === "fr" 
        ? "Bienvenue à la newsletter de Réseau Evolve Capital"
        : "Welcome to Réseau Evolve Capital Newsletter";
      
      const content = locale === "fr"
        ? `<p>Merci de vous être inscrit à notre newsletter.</p>
           <p>Vous recevrez désormais nos dernières actualités et opportunités d'investissement.</p>
           <p>L'équipe Réseau Evolve Capital</p>`
        : `<p>Thank you for subscribing to our newsletter.</p>
           <p>You will now receive our latest news and investment opportunities.</p>
           <p>The Réseau Evolve Capital Team</p>`;
      
      // Use Brevo API to send the email
      const emailData = {
        sender: CONFIG.EMAIL_SENDER,
        to: [{ email: email }],
        subject: subject,
        htmlContent: content
      };
      
      UrlFetchApp.fetch("https://api.brevo.com/v3/smtp/email", {
        method: "post",
        contentType: "application/json",
        headers: {
          "api-key": CONFIG.BREVO_API_KEY,
          "Accept": "application/json"
        },
        payload: JSON.stringify(emailData),
        muteHttpExceptions: true
      });
      
    } catch (error) {
      console.error("Error sending confirmation email: ", error);
      // Continue even if email sending fails
    }
  }
  
  // ====================================================================================================
  // HELPER FUNCTIONS - SECURITY & VALIDATION
  // ====================================================================================================
  
  /**
   * Validate email format
   */
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Check if request comes from an allowed origin
   */
  function isAllowedOrigin(origin) {
    if (!origin) return false;
    
    return CONFIG.ALLOWED_DOMAINS.some(domain => 
      origin === `http://${domain}` || 
      origin === `https://${domain}`
    );
  }
  
  /**
   * Basic rate limiting to prevent abuse
   */
  function isRateLimitExceeded() {
    if (!CONFIG.ENABLE_RATE_LIMITING) return false;
    
    const cache = CacheService.getScriptCache();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const cacheKey = `newsletter_submissions_${today}`;
    
    const currentCount = cache.get(cacheKey);
    const submissionCount = currentCount ? parseInt(currentCount, 10) : 0;
    
    if (submissionCount >= CONFIG.MAX_DAILY_SUBMISSIONS) {
      return true;
    }
    
    // Update the count
    cache.put(cacheKey, (submissionCount + 1).toString(), 86400); // 24 hours
    return false;
  }
  
  // ====================================================================================================
  // HELPER FUNCTIONS - RESPONSE FORMATTING
  // ====================================================================================================
  
  /**
   * Handle CORS pre-flight requests
   */
  function handleCorsPreFlight() {
    return ContentService.createTextOutput("")
      .setMimeType(ContentService.MimeType.TEXT);
  }
  
  /**
   * Create a standardized error response
   */
  function createErrorResponse(message, statusCode) {
    const response = {
      success: false,
      message: message,
      statusCode: statusCode,
      timestamp: new Date().toISOString()
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  /**
   * Create a standardized success response
   */
  function createSuccessResponse(message, additionalData = {}) {
    const response = {
      success: true,
      message: message,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      ...additionalData
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // ====================================================================================================
  // UTILITY FUNCTIONS
  // ====================================================================================================
  
  /**
   * Get all subscribers (for admin purposes)
   */
  function getAllSubscribers() {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      //const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      
      if (!sheet) {
        return [];
      }
      
      // Get all data (excluding header row)
      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();
      
      if (lastRow <= 1) {
        return []; // Only header row exists
      }
      
      const range = sheet.getRange(2, 1, lastRow - 1, lastColumn);
      const data = range.getValues();
      
      // Get headers
      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      
      // Convert to array of objects
      return data.map(row => {
        const subscriber = {};
        headers.forEach((header, index) => {
          subscriber[header] = row[index];
        });
        return subscriber;
      });
      
    } catch (error) {
      console.error("Error getting all subscribers: ", error);
      return [];
    }
  }
  
  /**
   * Testing function - can be run manually to verify everything works
   */
  function testNewsletterSubscription() {
    const testData = {
      email: "zoc.lionel@gmail.com",
      name: "Test User",
      locale: "fr",
      source: "website"
    };
    
    // Mock the event object
    const mockEvent = {
      postData: {
        contents: JSON.stringify(testData)
      }
    };
    
    // Process the subscription
    const response = handleNewsletterSubscription(mockEvent);
    console.log("Test Response: ", response);
  }
  
  // ====================================================================================================
  // For testing the integration with your website
  // ====================================================================================================
  
  /**
   * Special handler for GET requests to test if the API is working
   */
  function doGet(e) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Réseau Evolve Capital Newsletter API is running",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } 