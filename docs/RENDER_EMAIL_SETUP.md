# Setting Up Email Verification on Render (Brevo)

## Your Configuration

Based on your `.env` file, here are your settings:

- **Brevo API Key**: ✅ Ready to add
- **Email Service**: Brevo (formerly Sendinblue)
- **Server URL**: `https://mathgameapp.onrender.com`
- **MongoDB**: ✅ Connected

## Add Environment Variables to Render

### Step 1: Go to Render Dashboard

1. Go to https://dashboard.render.com
2. Click on your **mathgameapp** service

### Step 2: Add Environment Variables

1. Click the **"Environment"** tab on the left
2. Click **"Add Environment Variable"**
3. Add these **4 variables**:

#### Variable 1: BREVO_API_KEY
```
Key: BREVO_API_KEY
Value: xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
**Note**: Use your actual Brevo API key from https://app.brevo.com/settings/keys/api

#### Variable 2: BREVO_FROM_EMAIL
```
Key: BREVO_FROM_EMAIL
Value: noreply@yourdomain.com
```
**Note**: Use the sender email you verified in Brevo settings

#### Variable 3: BREVO_FROM_NAME
```
Key: BREVO_FROM_NAME
Value: Math Game App
```

#### Variable 4: BASE_URL
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
   - Look for: `[EmailService] ✅ Brevo email service initialized`
   - Look for: `[EmailService] Sending from: Math Game App <noreply@yourdomain.com>`

2. Test in your app:
   - Create a new account with your email
   - Check server logs for: `[EmailService] Verification email sent to your-email@domain.com`
   - Check your inbox for verification email

## Important Notes

### About Brevo Free Tier

✅ **Benefits:**
- **300 emails/day** (9,000/month) free forever
- Works with authenticated domains
- Professional sender addresses
- Marketing automation included
- No "via" tags if domain is authenticated

### Sender Email Requirements

Your `BREVO_FROM_EMAIL` must be:
1. Added in Brevo dashboard at https://app.brevo.com/settings/keys/smtp
2. Either:
   - A single verified email (quick start)
   - OR from an authenticated domain (production ready)

### Domain Authentication

If you authenticated your domain:
- ✅ Emails look professional (from your domain)
- ✅ Better deliverability
- ✅ Can use any email @yourdomain.com
- ✅ No "via" tags in email clients

See `docs/BREVO_SETUP.md` or `docs/BREVO_SQUARESPACE_DNS.md` for setup instructions.

## Troubleshooting

### "Email service not configured"

**Check server logs** for:
```
[EmailService] ⚠️  Brevo API key not configured
```

**Solution:** Make sure you added `BREVO_API_KEY` to Render environment variables.

### "Failed to send email"

**Check API key** is correct:
- Should start with `xkeysib-`
- Should be exactly as shown in Brevo dashboard
- No extra spaces or quotes

### "Sender not verified"

**Error:** "Sender email not authorized"

**Solution:**
1. Go to https://app.brevo.com/settings/keys/smtp
2. Click "Add a new sender"
3. Add your `BREVO_FROM_EMAIL` address
4. Verify it (if single email) or authenticate domain

### "Email not received"

1. **Check spam folder**
2. **Verify sender in Brevo**: Go to https://app.brevo.com/settings/keys/smtp
3. **Check server logs** for error messages
4. **Check Brevo logs**: https://app.brevo.com/statistics/email (shows all sent emails)

### "Verification link doesn't work"

Make sure `BASE_URL` is set correctly:
- Should be: `https://mathgameapp.onrender.com`
- NOT: `http://` (must be https)
- NO trailing slash

## Testing Checklist

- [ ] Added all 4 environment variables to Render
- [ ] Added sender email in Brevo dashboard
- [ ] Saved changes and waited for redeploy
- [ ] Checked logs for "Brevo email service initialized"
- [ ] Created test account in app
- [ ] Received verification email
- [ ] Clicked verification link successfully
- [ ] Saw "Email Verified!" success page

## Next Steps

Once everything works:

1. ✅ You're all set!
2. 📊 Monitor usage at https://app.brevo.com/statistics/email
3. 🎯 Set up campaigns for game events (see `docs/BREVO_SETUP.md`)
4. 🚀 You're live with 300 emails/day free!
