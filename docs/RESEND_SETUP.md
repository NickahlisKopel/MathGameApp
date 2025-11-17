# Resend Email Setup Guide

This guide walks you through setting up Resend for email verification in your Math Game App.

## Why Resend?

- ✅ **Simple API** - No SMTP configuration needed
- ✅ **Generous Free Tier** - 3,000 emails/month free, 100 emails/day
- ✅ **Fast Setup** - Get running in 5 minutes
- ✅ **Great Deliverability** - High inbox placement rates
- ✅ **Developer Friendly** - Clean API, excellent docs

---

## Quick Start (Using Test Domain)

### 1. Create Resend Account

1. Go to https://resend.com/signup
2. Sign up with GitHub or email
3. Verify your email

### 2. Get Your API Key

1. Go to https://resend.com/api-keys
2. Click **"Create API Key"**
3. Name it (e.g., "Math Game Production")
4. Choose **"Sending access"** permission
5. Click **"Add"**
6. **Copy the API key** (you won't see it again!)

### 3. Configure Server

Add to your Render environment variables:

```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**That's it!** Using `onboarding@resend.dev` lets you test immediately without domain setup.

### 4. Test It

Deploy your server and create an account. You'll receive a verification email from `onboarding@resend.dev`.

**Limitations of test domain:**
- Can only send to your own verified email addresses
- Shows "via resend.dev" in email clients
- Not suitable for production

---

## Production Setup (Custom Domain)

For production, you'll want emails from your own domain (e.g., `noreply@yourgame.com`).

### Step 1: Choose Your Domain

You need a domain you own. Options:

- **Already have a domain?** Use it (e.g., `mathgameapp.com`)
- **Need a domain?** Buy one from:
  - Namecheap (~$10/year)
  - Google Domains
  - Cloudflare (~$10/year)
  - GoDaddy

💡 **Tip:** You can use a subdomain like `mail.mathgameapp.com` if you want to keep your main domain separate.

### Step 2: Add Domain to Resend

1. Go to https://resend.com/domains
2. Click **"Add Domain"**
3. Enter your domain (e.g., `mathgameapp.com`)
4. Click **"Add"**

Resend will show you DNS records to add.

### Step 3: Add DNS Records

You'll need to add 3 DNS records to your domain registrar:

#### Record 1: SPF (TXT Record)
```
Type: TXT
Name: @ (or your domain)
Value: v=spf1 include:_spf.resend.com ~all
```

#### Record 2: DKIM (TXT Record)
```
Type: TXT
Name: resend._domainkey
Value: [long string provided by Resend]
```

#### Record 3: DMARC (TXT Record - Optional but recommended)
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:your-email@domain.com
```

### Step 4: Where to Add DNS Records

#### Namecheap
1. Login to Namecheap
2. Go to **Domain List** → Your domain
3. Click **"Advanced DNS"**
4. Click **"Add New Record"**
5. Add each record (select TXT type)
6. Save changes

#### Cloudflare
1. Login to Cloudflare
2. Select your domain
3. Go to **DNS** tab
4. Click **"Add record"**
5. Add each record (Type: TXT)
6. Save

#### Google Domains
1. Login to Google Domains
2. Select your domain
3. Go to **DNS** tab
4. Scroll to **Custom records**
5. Click **"Create new record"**
6. Add each record

#### GoDaddy
1. Login to GoDaddy
2. Go to **My Products** → Domains
3. Click **"DNS"** next to your domain
4. Scroll to **Records**
5. Click **"Add"** for each record
6. Select **TXT** type

### Step 5: Verify Domain

1. Wait 5-60 minutes for DNS propagation
2. Go back to https://resend.com/domains
3. Click **"Verify DNS Records"**
4. If successful, you'll see green checkmarks ✅

### Step 6: Update Environment Variables

Update your Render environment variables:

```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

Common email addresses to use:
- `noreply@yourdomain.com`
- `hello@yourdomain.com`
- `team@yourdomain.com`
- `verify@yourdomain.com`

### Step 7: Deploy and Test

1. Save environment variables (Render will auto-deploy)
2. Create a test account
3. Check your inbox - email should now come from your domain!

---

## Troubleshooting

### "DNS Records Not Found"

**Problem:** Resend can't verify your DNS records.

**Solutions:**
1. **Wait longer** - DNS can take up to 48 hours (usually 5-30 minutes)
2. **Check for typos** - Copy-paste values exactly as shown
3. **Check record name** - Some registrars want just `resend._domainkey`, others want `resend._domainkey.yourdomain.com`
4. **Verify with DNS checker**: Use https://mxtoolbox.com/SuperTool.aspx

### "Can't Send Emails"

**Problem:** Getting errors when sending.

**Solutions:**
1. **Check API key** - Make sure it's correctly set in environment variables
2. **Verify domain status** - Go to Resend dashboard and ensure domain shows as verified
3. **Check logs** - Look at Render logs for specific error messages
4. **Test with onboarding domain** - Try `onboarding@resend.dev` to rule out domain issues

### "Emails Going to Spam"

**Problem:** Emails arrive but in spam folder.

**Solutions:**
1. **Add all 3 DNS records** - Especially DMARC
2. **Warm up your domain** - Send emails gradually at first
3. **Improve email content** - Avoid spam trigger words
4. **Add unsubscribe link** - Required for bulk emails
5. **Ask recipients to whitelist** - For now, ask test users to mark as "not spam"

### "Domain Already Added"

**Problem:** "This domain has already been added to another account"

**Solutions:**
1. **Use a subdomain** - Instead of `yourdomain.com`, use `mail.yourdomain.com`
2. **Remove from old account** - If you have multiple Resend accounts
3. **Contact Resend support** - They can help transfer domains

---

## DNS Record Examples by Registrar

### Namecheap Format
```
Type: TXT
Host: @
Value: v=spf1 include:_spf.resend.com ~all

Type: TXT
Host: resend._domainkey
Value: [your DKIM key]

Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none;
```

### Cloudflare Format
```
Type: TXT
Name: yourdomain.com (or @)
Content: v=spf1 include:_spf.resend.com ~all

Type: TXT
Name: resend._domainkey.yourdomain.com
Content: [your DKIM key]

Type: TXT
Name: _dmarc.yourdomain.com
Content: v=DMARC1; p=none;
```

---

## Testing Your Setup

### Test 1: Check DNS Records

Use this command (replace with your domain):

```bash
# Check SPF
nslookup -type=TXT yourdomain.com

# Check DKIM
nslookup -type=TXT resend._domainkey.yourdomain.com

# Check DMARC
nslookup -type=TXT _dmarc.yourdomain.com
```

### Test 2: Send Test Email

Use Resend dashboard:
1. Go to https://resend.com/emails
2. Click "Send Test Email"
3. Send to your personal email
4. Check if it arrives in inbox (not spam)

### Test 3: Send from Your App

1. Create a test account
2. Check server logs for success message
3. Verify email arrives within 1-2 minutes
4. Click verification link to test full flow

---

## Best Practices

### Email Content

✅ **Do:**
- Use clear subject lines
- Include your app name and branding
- Provide plain text alternative
- Add unsubscribe link (for marketing emails)
- Keep emails concise

❌ **Don't:**
- Use ALL CAPS in subject
- Include too many links
- Use spam trigger words (FREE!, URGENT!, etc.)
- Send from generic addresses (info@, admin@)

### Domain Reputation

- **Start slow** - Don't send 1000s of emails on day 1
- **Monitor bounces** - Remove invalid email addresses
- **Handle unsubscribes** - Respect user preferences
- **Engage users** - High open rates improve reputation

---

## Cost

### Resend Pricing (as of 2024)

**Free Tier:**
- 3,000 emails/month
- 100 emails/day
- 1 custom domain
- Email API
- Webhooks

**Pro Plan ($20/month):**
- 50,000 emails/month
- Unlimited custom domains
- Email analytics
- Priority support

For Math Game App, the **free tier is perfect** to start!

---

## Environment Variables Summary

### Development (Test Domain)
```env
RESEND_API_KEY=re_abc123...
RESEND_FROM_EMAIL=onboarding@resend.dev
BASE_URL=http://localhost:3000
```

### Production (Custom Domain)
```env
RESEND_API_KEY=re_abc123...
RESEND_FROM_EMAIL=noreply@yourdomain.com
BASE_URL=https://your-app.onrender.com
```

---

## Support Resources

- **Resend Docs**: https://resend.com/docs
- **DNS Setup Guide**: https://resend.com/docs/dashboard/domains/introduction
- **API Reference**: https://resend.com/docs/api-reference/introduction
- **Status Page**: https://status.resend.com
- **Support**: support@resend.com

---

## Quick Checklist

Development Setup:
- [ ] Create Resend account
- [ ] Generate API key
- [ ] Add `RESEND_API_KEY` to Render
- [ ] Set `RESEND_FROM_EMAIL=onboarding@resend.dev`
- [ ] Test email sending

Production Setup:
- [ ] Own/purchase domain
- [ ] Add domain to Resend
- [ ] Add SPF DNS record
- [ ] Add DKIM DNS record
- [ ] Add DMARC DNS record
- [ ] Wait for DNS propagation (5-60 min)
- [ ] Verify domain in Resend
- [ ] Update `RESEND_FROM_EMAIL` with your domain
- [ ] Test in production
- [ ] Monitor delivery rates

---

## Next Steps

1. **Get your API key** from https://resend.com/api-keys
2. **Add to Render** environment variables
3. **Deploy** and test with `onboarding@resend.dev`
4. **Set up custom domain** when ready for production

Need help? Check the troubleshooting section or reach out to Resend support!
