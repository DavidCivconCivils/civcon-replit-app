import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
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
    // For development/testing, use a test account from Ethereal
    if (process.env.NODE_ENV === 'development') {
      console.log('Using test email account for development');
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || 'test@ethereal.email',
          pass: process.env.EMAIL_PASS || 'testpassword'
        }
      });
    }

    // For production, use configured email service
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.example.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || 'noreply@civcon.example.com',
        pass: process.env.EMAIL_PASS || ''
      }
    });
  }
  
  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<{success: boolean, error?: any}> {
  try {
    const transport = getTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Civcon Office <noreply@civcon.example.com>',
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
