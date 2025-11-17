# Email Verification Setup Guide

This guide explains how to set up email verification for user accounts without using Firebase.

## Overview

The email verification system uses:
- **nodemailer** for sending emails
- **Server-side token generation** using crypto
- **Database storage** for verification tokens and email status
- **Email service provider** (Gmail, SendGrid, etc.)

## Server Setup

### 1. Install Dependencies

The required dependency is already added to `server/package.json`:

```bash
cd server
npm install
```

### 2. Configure Email Provider

**📧 We recommend using Resend - see [RESEND_SETUP.md](./RESEND_SETUP.md) for complete setup guide!**

#### Option A: Resend (Recommended - Easiest Setup)

1. **Create account** at https://resend.com/signup
2. **Generate API key** at https://resend.com/api-keys
3. **Set Environment Variables**:

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
BASE_URL=https://your-server-domain.com
```

**For testing:** Use `onboarding@resend.dev` (no domain setup needed!)

**For production:** See [RESEND_SETUP.md](./RESEND_SETUP.md) for custom domain setup.

#### Option B: Gmail (Alternative)

**Note:** Gmail requires App Password setup and has stricter limits. Resend is recommended instead.

### 3. Update Render Environment Variables

If deploying on Render:

1. Go to your Render dashboard
2. Select your service
3. Go to **Environment** tab
4. Add the environment variables:
   - `RESEND_API_KEY` (your Resend API key)
   - `RESEND_FROM_EMAIL` (use `onboarding@resend.dev` for testing)
   - `BASE_URL` (your Render service URL)

5. Save changes (service will auto-redeploy)

**See [RESEND_SETUP.md](./RESEND_SETUP.md) for detailed instructions and custom domain setup!**

## Client Integration

### Update AuthService

The AuthService will need to be updated to call the verification endpoints. Here's the flow:

```typescript
// After successful account creation
async createAccountWithEmail(email: string, password: string, displayName: string) {
  // ... existing validation ...
  
  // Create account locally
  const authUser = { /* ... */ };
  
  // Request email verification
  try {
    const response = await fetch(`${SERVER_URL}/api/email/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userId: authUser.id }),
    });
    
    const result = await response.json();
    
    if (result.skipVerification) {
      // Server doesn't have email configured - skip verification
      console.log('Email verification not configured on server');
    } else if (result.success) {
      // Show message to user to check their email
      Alert.alert(
        'Verify Your Email',
        `We've sent a verification link to ${email}. Please check your inbox and verify your email to access all features.`
      );
    }
  } catch (error) {
    console.error('Failed to send verification email:', error);
    // Continue anyway - don't block account creation
  }
  
  return authUser;
}
```

### Check Email Verification Status

```typescript
async checkEmailVerified(email: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${SERVER_URL}/api/email/status/${encodeURIComponent(email)}`
    );
    const data = await response.json();
    return data.verified || false;
  } catch (error) {
    console.error('Failed to check email status:', error);
    return false;
  }
}
```

### Resend Verification Email

```typescript
async resendVerificationEmail(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}/api/email/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    
    const result = await response.json();
    return result.success || false;
  } catch (error) {
    console.error('Failed to resend verification:', error);
    return false;
  }
}
```

## API Endpoints

### POST /api/email/send-verification
Sends a verification email to the user.

**Request:**
```json
{
  "email": "user@example.com",
  "userId": "player_123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

### GET /api/email/verify?token=TOKEN
Verifies an email using the token from the verification link.

**Response:** HTML page confirming verification

### GET /api/email/status/:email
Checks if an email is verified.

**Response:**
```json
{
  "exists": true,
  "verified": true,
  "userId": "player_123456"
}
```

### POST /api/email/resend-verification
Resends verification email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

## Security Features

1. **Token Expiration**: Verification links expire after 24 hours
2. **One-Time Use**: Tokens are deleted after successful verification
3. **Secure Generation**: Uses crypto.randomBytes for token generation
4. **Email Validation**: Server validates email format before sending
5. **Rate Limiting**: Consider adding rate limiting to prevent abuse

## UI/UX Recommendations

### 1. Show Verification Status

Add a banner in the app for unverified users:

```tsx
{!emailVerified && (
  <View style={styles.verificationBanner}>
    <Text style={styles.bannerText}>
      📧 Please verify your email to unlock all features
    </Text>
    <TouchableOpacity onPress={handleResendEmail}>
      <Text style={styles.resendLink}>Resend Email</Text>
    </TouchableOpacity>
  </View>
)}
```

### 2. Restrict Features

Limit features for unverified users:

```typescript
const canAccessOnlineMultiplayer = async () => {
  const user = await authService.getCurrentUser();
  if (!user || !user.email) return true; // Offline/guest users
  
  const verified = await authService.checkEmailVerified(user.email);
  if (!verified) {
    Alert.alert(
      'Email Verification Required',
      'Please verify your email to play online multiplayer.',
      [
        { text: 'Resend Email', onPress: handleResendEmail },
        { text: 'OK' }
      ]
    );
    return false;
  }
  
  return true;
};
```

### 3. Verification Settings Screen

Add a settings option to check/manage email verification:

```tsx
<TouchableOpacity onPress={async () => {
  const status = await checkEmailStatus();
  if (status.verified) {
    Alert.alert('✅ Email Verified', 'Your email is verified!');
  } else {
    Alert.alert(
      'Email Not Verified',
      'Please check your inbox for the verification email.',
      [
        { text: 'Resend', onPress: handleResendEmail },
        { text: 'OK' }
      ]
    );
  }
}}>
  <Text>Email Verification Status</Text>
</TouchableOpacity>
```

## Testing

### Local Testing

1. Start the server with email credentials:
```bash
cd server
EMAIL_USER=your-email@gmail.com EMAIL_PASSWORD=your-app-password npm start
```

2. Create an account in the app
3. Check your email for the verification link
4. Click the link to verify

### Testing Without Email Setup

The system gracefully handles missing email configuration:
- Server logs a warning but continues running
- Verification endpoints return `skipVerification: true`
- App can check this flag and skip verification requirements

## Troubleshooting

### "Failed to send email"

**Gmail**: Make sure you're using an App Password, not your regular password.

**Port Issues**: Try port 465 with `secure: true` instead of 587.

**Firewall**: Ensure outbound connections to SMTP ports are allowed.

### "Email not received"

1. Check spam/junk folder
2. Verify `EMAIL_USER` is correct
3. Check server logs for error messages
4. Try resending verification email

### "Link expired"

Tokens expire after 24 hours. Use the "Resend Verification" option.

## Production Checklist

- [ ] Set up reliable SMTP service (SendGrid/Mailgun recommended)
- [ ] Configure environment variables on hosting platform
- [ ] Set correct `BASE_URL` to your production domain
- [ ] Add rate limiting to verification endpoints
- [ ] Monitor email delivery rates
- [ ] Set up email templates with your branding
- [ ] Test verification flow end-to-end
- [ ] Add email change functionality (if needed)
- [ ] Implement email preferences/unsubscribe (for marketing emails)

## Optional Enhancements

1. **Custom Email Templates**: Modify `emailService.js` to use custom HTML templates
2. **Multi-Language Support**: Send emails in user's preferred language
3. **Welcome Email**: Send a welcome email after successful verification
4. **Account Recovery**: Use the same system for password reset emails
5. **Email Notifications**: Extend to send game notifications, friend requests, etc.

## Support

If users report not receiving emails:
1. Check they entered correct email
2. Ask them to check spam folder
3. Verify server email service is running
4. Use resend verification option
5. Check server logs for delivery errors
