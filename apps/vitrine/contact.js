// ====================================================================================================
// CONTACT FORM HANDLER FOR RÉSEAU EVOLVE CAPITAL
// ====================================================================================================
// This script handles the following:
// 1. Receiving and validating contact form submissions from the website
// 2. Recording submissions in a Google Sheet with timestamps and all form data
// 3. Optionally adding contacts to Brevo (formerly Sendinblue) for lead management
// 4. Sending email notifications to administrators
// 5. Providing appropriate response messages in both French and English
// ====================================================================================================

// Configuration Constants - CUSTOMIZE THESE VALUES
const CONFIG = {
  // Google Sheets Configuration
  SPREADSHEET_ID: "YOUR_SPREADSHEET_ID_HERE", // ID of the Google Sheet to save contact submissions
  SHEET_NAME: "Contact Submissions", // Name of the sheet tab
  
  // Brevo API Configuration
  BREVO_API_KEY: "YOUR_BREVO_API_KEY_HERE", // Your Brevo API key
  BREVO_LIST_ID: 5, // Different list ID from the newsletter (for contacts/leads)
  BREVO_LIST_ID_NEWSLETTER: 4, // Newsletter list ID
  // Notification Email Configuration
  ENABLE_ADMIN_NOTIFICATION: true, // Set to true to send notifications to admin
  ADMIN_EMAIL: "contact@reseauevolvecapital.com", // Admin email to receive notifications
  ADMIN_EMAILS: ["contact@reseauevolvecapital.com", "lionel@omniventus.com"],
  
  // Email Templates
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
  MAX_DAILY_SUBMISSIONS: 100 // Maximum number of submissions per day (lower than newsletter)
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
    if (e.parameter && e.parameter.method === "OPTIONS") {
      return handleCorsPreFlight();
    }
    
    // Process the request
    return handleContactFormSubmission(e);
  } catch (error) {
    console.error("Error in doPost: ", error);
    return createErrorResponse("Server error occurred", 500);
  }
}

/**
 * Handle incoming contact form submission
 */
function handleContactFormSubmission(e) {
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
    
    // Extract form data
    const {
      name,
      email,
      //subject,
      newsletter = false,
      locale = "fr"
    } = requestData;
    
    // Validate required fields
    if (!validateRequiredFields(requestData)) {
      return createErrorResponse(
        locale === "fr" 
          ? "Veuillez remplir tous les champs obligatoires" 
          : "Please fill in all required fields", 
        400
      );
    }
    
    // Validate email
    if (!isValidEmail(email)) {
      return createErrorResponse(
        locale === "fr" 
          ? "Adresse email invalide" 
          : "Invalid email address", 
        400
      );
    }
    
    // Record in spreadsheet
    const spreadsheetResult = recordInSpreadsheet(requestData);
    if (!spreadsheetResult.success) {
      return createErrorResponse(spreadsheetResult.message, 500);
    }
    
    // Send admin notification email
    if (CONFIG.ENABLE_ADMIN_NOTIFICATION) {
      sendAdminNotification(requestData);
    }
    
    // Add to Brevo if newsletter opt-in
    if (newsletter) {
      addToBrevoNewsletter(email, name, locale);
    }
    
    // Add contact to Brevo CRM (different list than newsletter)
    addToBrevoContacts(requestData);
    
    // Create response message based on locale
    const message = locale === "fr"
      ? "Merci pour votre message. Nous vous répondrons dans les plus brefs délais."
      : "Thank you for your message. We will respond as soon as possible.";
    
    return createSuccessResponse(message);
    
  } catch (error) {
    console.error("Error processing contact form: ", error);
    return createErrorResponse("Failed to process form submission", 500);
  }
}

// ====================================================================================================
// HELPER FUNCTIONS - VALIDATION
// ====================================================================================================

/**
 * Validate that all required fields are present and non-empty
 */
function validateRequiredFields(data) {
  const requiredFields = ['name', 'email', 'subject', 'message'];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ====================================================================================================
// HELPER FUNCTIONS - GOOGLE SHEETS
// ====================================================================================================

/**
 * Records a new contact form submission in the Google Sheet
 */
function recordInSpreadsheet(formData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    if (!sheet) {
      // Create the sheet if it doesn't exist
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
      
      // Add headers
      const headers = [
        "Timestamp", 
        "Name", 
        "Email", 
        "Subject", 
        "Message", 
        "Newsletter Opt-in", 
        "Language", 
        "Source"
      ];
      
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
      
      // Format the header row
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground("#F3903F")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold");
      
      // Auto-resize columns
      sheet.autoResizeColumns(1, headers.length);
    }
    
    // Prepare row data
    const timestamp = new Date().toISOString();
    const rowData = [
      timestamp,
      formData.name || "",
      formData.email || "",
      formData.subject || "",
      formData.message || "",
      formData.newsletter ? "Yes" : "No",
      formData.locale || "fr",
      formData.source || "website"
    ];
    
    // Add the new submission to the sheet
    sheet.appendRow(rowData);
    
    return { success: true };
  } catch (error) {
    console.error("Error recording in spreadsheet: ", error);
    return { success: false, message: "Failed to record in spreadsheet" };
  }
}

// ====================================================================================================
// HELPER FUNCTIONS - BREVO INTEGRATION
// ====================================================================================================

/**
 * Add a contact to Brevo CRM (for leads/contacts management)
 */
function addToBrevoContacts(formData) {
  try {
    // Map subjects to more descriptive lead types
    const leadTypes = {
      "join-a-club": "Club Membership",
      "propose-a-partnership": "Partnership",
      "request-information": "Information Request",
      "other": "Other"
    };
    
    // Prepare request data for Brevo
    const brevoData = {
      email: formData.email,
      attributes: {
        FIRSTNAME: formData.name,
        WEBSITE_LOCALE: formData.locale || "fr",
        CONTACT_DATE: new Date().toISOString(),
        SUBJECT: formData.subject,
        MESSAGE: formData.message,
        CONTACT_TYPE: leadTypes[formData.subject] || "General Contact"
      },
      listIds: [CONFIG.BREVO_LIST_ID], // Use the contacts list ID
      updateEnabled: true // Update the contact if it already exists
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
    
    // Handle the response (log but don't fail if there's an issue)
    const responseCode = response.getResponseCode();
    if (responseCode >= 400) {
      console.error("Brevo contacts API error: " + response.getContentText());
    }
    
    return true;
  } catch (error) {
    console.error("Error adding contact to Brevo CRM: ", error);
    return false; // Don't fail the whole submission if Brevo integration fails
  }
}

/**
 * Add a contact to Brevo newsletter list if they opted in
 */
function addToBrevoNewsletter(email, name, locale) {
  try {
    // Prepare request data for Brevo
    const brevoData = {
      email: email,
      attributes: {
        FIRSTNAME: name,
        WEBSITE_LOCALE: locale,
        SIGNUP_DATE: new Date().toISOString(),
        SIGNUP_SOURCE: "contact_form"
      },
      listIds: [CONFIG.BREVO_LIST_ID_NEWSLETTER], // Use the newsletter list ID (hardcoded from newsletter.js)
      updateEnabled: true
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
    
    // Log but don't fail if there's an issue
    const responseCode = response.getResponseCode();
    if (responseCode >= 400) {
      console.error("Brevo newsletter API error: " + response.getContentText());
    }
    
    return true;
  } catch (error) {
    console.error("Error adding contact to Brevo newsletter: ", error);
    return false;
  }
}

// ====================================================================================================
// HELPER FUNCTIONS - EMAIL NOTIFICATIONS
// ====================================================================================================

/**
 * Send notification email to administrators using Gmail
 */
function sendAdminNotification(formData) {
  if (!CONFIG.ENABLE_ADMIN_NOTIFICATION) return;
  
  try {
    const { name, email, subject, message, locale = "fr" } = formData;
    
    // Get subject line based on form subject
    const subjectMap = {
      "join-a-club": locale === "fr" ? "Demande d'adhésion à un club" : "Club Membership Request",
      "propose-a-partnership": locale === "fr" ? "Proposition de partenariat" : "Partnership Proposal",
      "request-information": locale === "fr" ? "Demande d'information" : "Information Request",
      "other": locale === "fr" ? "Autre demande" : "Other Request"
    };
    
    const emailSubject = subjectMap[subject] || (locale === "fr" ? "Nouveau message du formulaire de contact" : "New Contact Form Submission");
    
    // Create HTML content for email
    const htmlContent = `
      <h2>${locale === "fr" ? "Nouveau message du formulaire de contact" : "New Contact Form Submission"}</h2>
      <p><strong>${locale === "fr" ? "De" : "From"}:</strong> ${name} (${email})</p>
      <p><strong>${locale === "fr" ? "Sujet" : "Subject"}:</strong> ${subjectMap[subject] || subject}</p>
      <p><strong>${locale === "fr" ? "Message" : "Message"}:</strong></p>
      <div style="padding: 10px; border-left: 4px solid #F3903F; background-color: #f9f9f9;">
        ${message.replace(/\n/g, '<br>')}
      </div>
      <p><strong>${locale === "fr" ? "Inscription à la newsletter" : "Newsletter subscription"}:</strong> ${formData.newsletter ? "Oui" : "Non"}</p>
      <p><strong>${locale === "fr" ? "Langue" : "Language"}:</strong> ${locale === "fr" ? "Français" : "English"}</p>
      <p><em>${locale === "fr" ? "Ce message a été envoyé via le formulaire de contact du site web." : "This message was sent via the website contact form."}</em></p>
    `;
    
    // Plain text version of the email (for email clients that don't support HTML)
    const plainTextContent = `${locale === "fr" ? "Nouveau message du formulaire de contact" : "New Contact Form Submission"}\n\n` +
      `${locale === "fr" ? "De" : "From"}: ${name} (${email})\n` +
      `${locale === "fr" ? "Sujet" : "Subject"}: ${subjectMap[subject] || subject}\n\n` +
      `${locale === "fr" ? "Message" : "Message"}:\n${message}\n\n` +
      `${locale === "fr" ? "Inscription à la newsletter" : "Newsletter subscription"}: ${formData.newsletter ? "Oui" : "Non"}\n` +
      `${locale === "fr" ? "Langue" : "Language"}: ${locale === "fr" ? "Français" : "English"}\n\n` +
      `${locale === "fr" ? "Ce message a été envoyé via le formulaire de contact du site web." : "This message was sent via the website contact form."}`;
    
    // Get the list of admin emails from config
    const adminEmails = Array.isArray(CONFIG.ADMIN_EMAILS) 
      ? CONFIG.ADMIN_EMAILS 
      : [CONFIG.ADMIN_EMAIL]; // Fallback to single email if array not provided
    
    // Send email to each admin in the list
    adminEmails.forEach(adminEmail => {
      if (!adminEmail || !adminEmail.trim()) return; // Skip empty emails
      
      GmailApp.sendEmail(
        adminEmail,
        emailSubject,
        plainTextContent,
        {
          htmlBody: htmlContent,
          name: 'Réseau Evolve Capital Contact Form',
          replyTo: email // Allow direct reply to the sender
        }
      );
    });
    
    return true;
  } catch (error) {
    console.error("Error sending admin notification: ", error);
    return false; // Don't fail the submission if notification fails
  }
}

// ====================================================================================================
// HELPER FUNCTIONS - SECURITY
// ====================================================================================================

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
  const cacheKey = `contact_submissions_${today}`;
  
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
    status: "error",
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
    status: "success",
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
 * Testing function - can be run manually to verify everything works
 */
function testContactFormSubmission() {
  const testData = {
    name: "Test User",
    email: "test@example.com",
    subject: "request-information",
    message: "This is a test message from the contact form.",
    newsletter: true,
    locale: "fr",
    source: "test"
  };
  
  // Mock the event object
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  // Process the submission
  const response = handleContactFormSubmission(mockEvent);
  console.log("Test Response: ", response);
}

/**
 * Gets all contact form submissions for a specified time period
 * (Useful for administrators to query data)
 */
function getContactSubmissions(days = 30) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      return { success: false, message: "Contact submissions sheet not found" };
    }
    
    // Get all data
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    
    if (lastRow <= 1) {
      return { success: true, submissions: [] }; // Only header row exists
    }
    
    // Get data from all rows
    const range = sheet.getRange(2, 1, lastRow - 1, lastColumn);
    const data = range.getValues();
    
    // Get headers
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    
    // Filter based on date if required
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Convert to array of objects
    const submissions = data
      .filter(row => {
        // If first column is timestamp, filter by date
        const rowDate = new Date(row[0]);
        return !isNaN(rowDate.getTime()) && rowDate >= cutoffDate;
      })
      .map(row => {
        const submission = {};
        headers.forEach((header, index) => {
          submission[header] = row[index];
        });
        return submission;
      });
    
    return { success: true, submissions };
    
  } catch (error) {
    console.error("Error getting contact submissions: ", error);
    return { success: false, message: "Failed to get contact submissions" };
  }
}

/**
 * Special handler for GET requests to test if the API is working
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Réseau Evolve Capital Contact Form API is running",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
} 