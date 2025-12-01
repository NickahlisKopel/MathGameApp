const brevo = require('@getbrevo/brevo');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.brevoClient = null;
    this.fromEmail = null;
    this.fromName = null;
    this.initialized = false;
  }

  initialize() {
    // Check if Brevo API key is available
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@example.com';
    const fromName = process.env.BREVO_FROM_NAME || 'Math Game App';
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    if (!apiKey) {
      console.log('[EmailService] ⚠️  Brevo API key not configured');
      console.log('[EmailService] Set BREVO_API_KEY environment variable');
      console.log('[EmailService] Get your API key from: https://app.brevo.com/settings/keys/api');
      console.log('[EmailService] Email verification will be disabled');
      return false;
    }

    try {
      // Initialize Brevo API client
      const apiInstance = new brevo.TransactionalEmailsApi();
      const apiKeyAuth = apiInstance.authentications['apiKey'];
      apiKeyAuth.apiKey = apiKey;

      this.brevoClient = apiInstance;
      this.fromEmail = fromEmail;
      this.fromName = fromName;
      this.baseUrl = baseUrl;
      this.initialized = true;
      console.log('[EmailService] ✅ Brevo email service initialized');
      console.log(`[EmailService] Sending from: ${fromName} <${fromEmail}>`);
      console.log(`[EmailService] Base URL: ${baseUrl}`);
      console.log(`[EmailService] API Key: ${apiKey.substring(0, 8)}...`);
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to initialize Brevo:', error.message);
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
      const sendSmtpEmail = new brevo.SendSmtpEmail();

      sendSmtpEmail.sender = { name: this.fromName, email: this.fromEmail };
      sendSmtpEmail.to = [{ email: email }];
      sendSmtpEmail.subject = 'Verify Your Email - Math Game App';
      sendSmtpEmail.htmlContent = `
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
      `;
      sendSmtpEmail.textContent = `
Welcome to Math Game App!

Please verify your email address by clicking the link below:
${verificationLink}

Or copy and paste this link into your browser.

This link will expire in 24 hours.

If you didn't create an account with Math Game App, you can safely ignore this email.

© ${new Date().getFullYear()} Math Game App
      `;

      const result = await this.brevoClient.sendTransacEmail(sendSmtpEmail);
      console.log(`[EmailService] Verification email sent to ${email} (ID: ${result.response.body.messageId})`);
      return { success: true, message: 'Verification email sent', emailId: result.response.body.messageId };
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error.message);
      if (error.response) {
        console.error('[EmailService] Brevo API error:', error.response.text);
      }
      return { success: false, message: 'Failed to send verification email', error: error.message };
    }
  }

  async sendPasswordResetEmail(email, token, baseUrl) {
    console.log('[EmailService] ===== SEND PASSWORD RESET EMAIL =====');
    console.log('[EmailService] To:', email);
    console.log('[EmailService] Token (first 8):', token.substring(0, 8));
    console.log('[EmailService] Base URL:', baseUrl);
    console.log('[EmailService] Initialized:', this.initialized);

    if (!this.initialized) {
      console.log('[EmailService] ❌ Service not initialized - cannot send email');
      return { success: false, message: 'Email service not configured' };
    }

    const resetLink = `${baseUrl}/reset-password.html?token=${token}`;
    console.log('[EmailService] Reset link:', resetLink);
    console.log('[EmailService] From email:', this.fromEmail);
    console.log('[EmailService] Calling Brevo API...');

    try {
      const sendSmtpEmail = new brevo.SendSmtpEmail();

      sendSmtpEmail.sender = { name: this.fromName, email: this.fromEmail };
      sendSmtpEmail.to = [{ email: email }];
      sendSmtpEmail.subject = 'Reset Your Password - Math Game App';
      sendSmtpEmail.htmlContent = `
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
      `;
      sendSmtpEmail.textContent = `
Math Game App - Password Reset Request

We received a request to reset your password. Click the link below to create a new password:
${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} Math Game App
      `;

      const result = await this.brevoClient.sendTransacEmail(sendSmtpEmail);
      console.log(`[EmailService] ✅ Password reset email sent successfully!`);
      console.log(`[EmailService] To: ${email}`);
      console.log(`[EmailService] Email ID: ${result.response.body.messageId}`);
      console.log('[EmailService] ===== EMAIL SEND COMPLETED =====');
      return { success: true, message: 'Password reset email sent', emailId: result.response.body.messageId };
    } catch (error) {
      console.error('[EmailService] ❌ Exception sending email:', error.message);
      console.error('[EmailService] Stack trace:', error.stack);
      if (error.response) {
        console.error('[EmailService] Brevo API error:', error.response.text);
      }
      return { success: false, message: 'Failed to send password reset email', error: error.message };
    }
  }

  isConfigured() {
    return this.initialized;
  }
}

module.exports = new EmailService();
