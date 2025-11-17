# Setting Up Email Verification on Render

## Your Configuration

Based on your `.env` file, here are your settings:

- **Resend API Key**: ✅ Added
- **Email From**: `onboarding@resend.dev` (test domain - works immediately!)
- **Server URL**: `https://mathgameapp.onrender.com`
- **MongoDB**: ✅ Connected

## Add Environment Variables to Render

### Step 1: Go to Render Dashboard

1. Go to https://dashboard.render.com
2. Click on your **mathgameapp** service

### Step 2: Add Environment Variables

1. Click the **"Environment"** tab on the left
2. Click **"Add Environment Variable"**
3. Add these **3 variables**:

#### Variable 1: RESEND_API_KEY
```
Key: RESEND_API_KEY
Value: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
**Note**: Use your actual Resend API key from https://resend.com/api-keys

#### Variable 2: RESEND_FROM_EMAIL
```
Key: RESEND_FROM_EMAIL
Value: onboarding@resend.dev
```

#### Variable 3: BASE_URL
```
Key: BASE_URL
Value: https://mathgameapp.onrender.com
```

### Step 3: Save Changes

1. Click **"Save Changes"**
2. Render will automatically redeploy your service
3. Wait 2-3 minutes for deployment to complete

### Step 4: Verify It's Working

After deployment completes:

1. Check the logs:
   - Click **"Logs"** tab
   - Look for: `[EmailService] ✅ Resend email service initialized`
   - Look for: `[EmailService] Sending from: onboarding@resend.dev`

2. Test in your app:
   - Create a new account with your email
   - Check server logs for: `[EmailService] Verification email sent to your-email@domain.com`
   - Check your inbox for verification email

## Important Notes

### About onboarding@resend.dev

✅ **Pros:**
- Works immediately (no domain setup!)
- Free to use
- Perfect for testing

⚠️ **Limitations:**
- Can only send to verified email addresses in Resend
- Shows "via resend.dev" in email clients
- Not ideal for production with many users

### Verifying Your Test Email

To receive emails at `onboarding@resend.dev`:

1. Go to https://resend.com/emails
2. Click **"Email Addresses"**
3. Add your personal email
4. Verify it via the link they send
5. Now you can receive test emails!

### When to Switch to Custom Domain

Switch to your own domain when:
- You're ready for production users
- You want professional branding
- You need to send to any email address

See `docs/RESEND_DOMAIN_FIX.md` for domain setup instructions.

## Troubleshooting

### "Email service not configured"

**Check server logs** for:
```
[EmailService] ⚠️  Resend API key not configured
```

**Solution:** Make sure you added `RESEND_API_KEY` to Render environment variables.

### "Failed to send email"

**Check API key** is correct:
- Should start with `re_`
- Should be exactly as shown in Resend dashboard
- No extra spaces or quotes

### "Email not received"

1. **Check spam folder**
2. **Verify your email in Resend**: Go to https://resend.com/emails → Email Addresses
3. **Check server logs** for error messages
4. **Check Resend logs**: https://resend.com/emails (shows all sent emails)

### "Verification link doesn't work"

Make sure `BASE_URL` is set correctly:
- Should be: `https://mathgameapp.onrender.com`
- NOT: `http://` (must be https)
- NO trailing slash

## Testing Checklist

- [ ] Added all 3 environment variables to Render
- [ ] Saved changes and waited for redeploy
- [ ] Checked logs for "Email service initialized"
- [ ] Verified your email address in Resend dashboard
- [ ] Created test account in app
- [ ] Received verification email
- [ ] Clicked verification link successfully
- [ ] Saw "Email Verified!" success page

## Next Steps

Once everything works with `onboarding@resend.dev`:

1. ✅ You're all set for testing!
2. 🎯 When ready for production, set up custom domain
3. 📧 Update `RESEND_FROM_EMAIL` to `noreply@yourdomain.com`
4. 🚀 Deploy and you're live!
