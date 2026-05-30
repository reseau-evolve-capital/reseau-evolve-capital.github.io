/******************************************************************************
 * This tutorial is based on the work of Martin Hawksey twitter.com/mhawksey  *
 * But has been simplified and cleaned up to make it more beginner friendly   *
 * All credit still goes to Martin and any issues/complaints/questions to me. *
 ******************************************************************************/

var TO_ADDRESS = "lionel@omniventus.com"; // where to send form data

function doPost(e) {
  try {
    if (!e.postData?.contents) {
      throw new Error("No data received");
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Validate secret key
    if (data.secret !== "amirmuerte") {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Unauthorized: Invalid secret key'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Sanitize inputs
    const sanitizedData = {
      timestamp: new Date(),
      project: (data.project || 'Unknown').toString().substring(0, 100),
      name: (data.name || '').toString().substring(0, 100),
      email: (data.email || '').toString().substring(0, 100),
      subject: (data.subject || '').toString().substring(0, 100),
      message: (data.message || '').toString().substring(0, 500)
    };

    // Append to spreadsheet
    sheet.appendRow([
      sanitizedData.timestamp,
      sanitizedData.project,
      sanitizedData.name,
      sanitizedData.email,
      sanitizedData.subject,
      sanitizedData.message
    ]);

    // Format timestamp for email
    const formattedDate = Utilities.formatDate(
      sanitizedData.timestamp, 
      Session.getScriptTimeZone(), 
      "MMM dd, yyyy 'at' HH:mm:ss"
    );

    // Create HTML email template
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d3748;">New Contact Form Submission</h2>
            <div style="background: #f7fafc; padding: 20px; border-radius: 8px;">
              <p><strong>Project:</strong> ${sanitizedData.project}</p>
              <p><strong>Name:</strong> ${sanitizedData.name}</p>
              <p><strong>Email:</strong> ${sanitizedData.email}</p>
              <p><strong>Subject:</strong> ${sanitizedData.subject}</p>
              <p><strong>Message:</strong></p>
              <div style="white-space: pre-wrap; background: white; padding: 15px; border-radius: 4px;">
                ${sanitizedData.message}
              </div>
              <p style="margin-top: 20px; color: #718096;">
                Received on ${formattedDate}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email with HTML formatting
    GmailApp.sendEmail(
      TO_ADDRESS,
      `New Contact Form Submission: ${sanitizedData.subject}`,
      '', // Plain text body (fallback)
      {
        htmlBody: htmlBody,
        name: 'Contact Form Notification',
        replyTo: sanitizedData.email
      }
    );

    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success' 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error',
      message: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
} 