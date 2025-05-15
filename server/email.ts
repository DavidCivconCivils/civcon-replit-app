import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  cc?: string;  // Add support for CC recipients
  bcc?: string; // Add support for BCC recipients
  subject: string;
  text: string;
  html: string;
  attachments?: {
    filename: string;
    content: Buffer;
  }[];
}

// Create reusable transporter
let transporter: nodemailer.Transporter;

// Initialize transporter
function getTransporter() {
  if (!transporter) {
    // Office 365 SMTP configuration
    transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false, // TLS requires secure to be false
      auth: {
        user: 'procurement@civconcivils.co.uk',
        pass: 'civcon.2134'
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false // Helps with some Office 365 configurations
      }
    });
    
    console.log('Office 365 email transport configured');
  }
  
  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<{success: boolean, error?: any}> {
  try {
    const transport = getTransporter();
    
    const mailOptions = {
      from: 'Civcon Office <procurement@civconcivils.co.uk>',
      ...options
    };
    
    const info = await transport.sendMail(mailOptions);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Email sent: %s', info.messageId);
      // Check if preview URL is available for test accounts
      if (info.messageId && info.envelope && (info as any).testAccount) {
        console.log('Preview URL: %s', (info as any).previewUrl);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    // Return error information instead of throwing
    return { 
      success: false, 
      error 
    };
  }
}
