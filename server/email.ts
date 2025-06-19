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
    // Get email configuration from environment variables or use defaults
    const emailUser = process.env.EMAIL_USER || 'procurement@civconcivils.co.uk';
    const emailPass = process.env.EMAIL_PASS || 'civcon.2134';
    const smtpHost = process.env.SMTP_HOST || 'smtp.office365.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    
    console.log(`Configuring email transport: ${emailUser}@${smtpHost}:${smtpPort}`);
    
    // Office 365 SMTP configuration
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // TLS requires secure to be false
      auth: {
        user: emailUser,
        pass: emailPass
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false // Helps with some Office 365 configurations
      }
    });
    
    console.log('Email transport configured successfully');
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
    
    console.log(`Attempting to send email to: ${options.to}, CC: ${options.cc || 'none'}, Subject: ${options.subject}`);
    
    const info = await transport.sendMail(mailOptions);
    
    console.log(`Email sent successfully - Message ID: ${info.messageId}`);
    console.log(`Email accepted by: ${info.accepted?.join(', ') || 'unknown'}`);
    if (info.rejected && info.rejected.length > 0) {
      console.log(`Email rejected by: ${info.rejected.join(', ')}`);
    }
    
    if (process.env.NODE_ENV === 'development') {
      // Check if preview URL is available for test accounts
      if (info.messageId && info.envelope && (info as any).testAccount) {
        console.log('Preview URL: %s', (info as any).previewUrl);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    if (error instanceof Error) {
      console.error('Email error details:', {
        message: error.message,
        code: (error as any).code,
        command: (error as any).command
      });
    }
    
    // Return error information instead of throwing
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
