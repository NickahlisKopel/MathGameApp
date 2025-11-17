const { Resend } = require('resend');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.resend = null;
    this.fromEmail = null;
    this.initialized = false;
  }

  initialize() {
    // Check if Resend API key is available
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (!apiKey) {
      console.log('[EmailService] ⚠️  Resend API key not configured');
      console.log('[EmailService] Set RESEND_API_KEY environment variable');
      console.log('[EmailService] Get your API key from: https://resend.com/api-keys');
      console.log('[EmailService] Email verification will be disabled');
      return false;
    }

    try {
      this.resend = new Resend(apiKey);
      this.fromEmail = fromEmail;
      this.initialized = true;
      console.log('[EmailService] ✅ Resend email service initialized');
      console.log(`[EmailService] Sending from: ${fromEmail}`);
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to initialize Resend:', error.message);
      return false;
    }
  }

  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async sendVerificationEmail(email, token, baseUrl) {
    if (!this.initialized) {
      console.log('[EmailService] Skipping verification email - service not configured');
      return { success: false, message: 'Email service not configured' };
    }

    const verificationLink = `${baseUrl}/api/email/verify?token=${token}`;
    
    try {
      const { data, error } = await this.resend.emails.send({
        from: `Math Game App <${this.fromEmail}>`,
        to: [email],
        subject: 'Verify Your Email - Math Game App',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 15px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .button:hover { background: #45a049; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .code { background: #e8e8e8; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 14px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Math Game App</h1>
              <p>Welcome to Math Game!</p>
            </div>
            <div class="content">
              <h2>Verify Your Email Address</h2>
              <p>Thanks for signing up! Please verify your email address to complete your registration and unlock all features.</p>
              
              <p style="text-align: center;">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </p>
              
              <p>Or copy and paste this link into your browser:</p>
              <div class="code">${verificationLink}</div>
              
              <p><strong>Note:</strong> This link will expire in 24 hours for security reasons.</p>
              
              <p>If you didn't create an account with Math Game App, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Math Game App. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        text: `
Welcome to Math Game App!

Please verify your email address by clicking the link below:
${verificationLink}

Or copy and paste this link into your browser.

This link will expire in 24 hours.

If you didn't create an account with Math Game App, you can safely ignore this email.

© ${new Date().getFullYear()} Math Game App
      `,
      });

      if (error) {
        console.error('[EmailService] Resend API error:', error);
        return { success: false, message: 'Failed to send verification email', error: error.message };
      }

      console.log(`[EmailService] Verification email sent to ${email} (ID: ${data?.id})`);
      return { success: true, message: 'Verification email sent', emailId: data?.id };
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error.message);
      return { success: false, message: 'Failed to send verification email', error: error.message };
    }
  }

  async sendPasswordResetEmail(email, token, baseUrl) {
    if (!this.initialized) {
      console.log('[EmailService] Skipping password reset email - service not configured');
      return { success: false, message: 'Email service not configured' };
    }

    const resetLink = `${baseUrl}/reset-password.html?token=${token}`;
    
    try {
      const { data, error } = await this.resend.emails.send({
        from: `Math Game App <${this.fromEmail}>`,
        to: [email],
        subject: 'Reset Your Password - Math Game App',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 15px 30px; background: #ff5722; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .button:hover { background: #e64a19; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .code { background: #e8e8e8; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 14px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Math Game App</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              
              <p style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </p>
              
              <p>Or copy and paste this link into your browser:</p>
              <div class="code">${resetLink}</div>
              
              <p><strong>Note:</strong> This link will expire in 1 hour for security reasons.</p>
              
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Math Game App. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        text: `
Math Game App - Password Reset Request

We received a request to reset your password. Click the link below to create a new password:
${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} Math Game App
      `,
      });

      if (error) {
        console.error('[EmailService] Resend API error:', error);
        return { success: false, message: 'Failed to send password reset email', error: error.message };
      }

      console.log(`[EmailService] Password reset email sent to ${email} (ID: ${data?.id})`);
      return { success: true, message: 'Password reset email sent', emailId: data?.id };
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error.message);
      return { success: false, message: 'Failed to send password reset email', error: error.message };
    }
  }

  isConfigured() {
    return this.initialized;
  }
}

module.exports = new EmailService();
