# Brevo (Sendinblue) Email Setup Guide

This guide walks you through setting up Brevo for email verification, password resets, and promotional emails in your Math Game App.

## Why Brevo?

- ✅ **Most Generous Free Tier** - 300 emails/day (9,000/month) free forever
- ✅ **Simple API** - Easy integration, excellent documentation
- ✅ **Marketing Tools Included** - Campaign management, automation, templates
- ✅ **Cost-Effective** - Only $25/month for 20,000 emails (vs $20/month for 50,000 with others)
- ✅ **Great Deliverability** - High inbox placement rates
- ✅ **SMS Included** - Future expansion option

---

## Quick Start Guide

### Step 1: Create Brevo Account

1. Go to https://app.brevo.com/account/register
2. Sign up with your email
3. Verify your email address
4. Complete the onboarding questionnaire

### Step 2: Get Your API Key

1. Go to https://app.brevo.com/settings/keys/api
2. Click **"Generate a new API key"**
3. Name it (e.g., "Math Game Production")
4. Click **"Generate"**
5. **Copy the API key** (you won't see it again!)

### Step 3: Add Sender Email

Before sending emails, you must verify your sender email address.

#### Option A: Single Sender (Quick Setup)
1. Go to https://app.brevo.com/settings/keys/smtp
2. Under "Senders", click **"Add a new sender"**
3. Enter your email (e.g., `your-email@gmail.com`)
4. Brevo will send a verification email
5. Click the verification link in your email

**Note:** This allows you to start immediately but emails will show "via sendinblue.com"

#### Option B: Domain Verification (Production)
1. Go to https://app.brevo.com/settings/keys/smtp
2. Click **"Authenticate your domain"**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records provided by Brevo
5. Wait for verification (5-60 minutes)

For now, use **Option A** to test quickly. Move to **Option B** for production.

### Step 4: Configure Your Server

Add these environment variables to your server (Render, Heroku, etc.):

```env
BREVO_API_KEY=xkeysib-your_api_key_here
BREVO_FROM_EMAIL=your-email@gmail.com
BREVO_FROM_NAME=Math Game App
BASE_URL=https://your-app.onrender.com
```

### Step 5: Test It!

1. Deploy your server
2. Create a test account
3. Check your inbox for the verification email
4. Test password reset functionality

---

## Production Setup (Custom Domain)

For professional emails from your own domain (e.g., `noreply@mathgameapp.com`):

### Prerequisites

You need a domain you own. Options:
- **Already have a domain?** Perfect!
- **Need a domain?** Buy one from:
  - Namecheap (~$10/year)
  - Cloudflare (~$10/year)
  - Google Domains
  - GoDaddy

### Step 1: Authenticate Your Domain

1. Go to https://app.brevo.com/settings/keys/smtp
2. Click **"Authenticate your domain"**
3. Enter your domain (e.g., `mathgameapp.com`)
4. Brevo will show you DNS records to add

### Step 2: Add DNS Records

You'll need to add these records to your domain registrar:

#### Record 1: SPF (TXT Record)
```
Type: TXT
Name: @ (or your domain)
Value: v=spf1 include:spf.sendinblue.com mx ~all
```

#### Record 2: DKIM (TXT Record)
```
Type: TXT
Name: mail._domainkey
Value: [long string provided by Brevo - copy exactly]
```

#### Record 3: MX Record (Optional - for reply tracking)
```
Type: MX
Name: @
Value: smtp-relay.sendinblue.com
Priority: 5
```

### Step 3: Add DNS Records by Registrar

#### Namecheap
1. Login → Domain List → Your domain
2. Click **"Advanced DNS"**
3. Click **"Add New Record"**
4. Add each record, save changes

#### Cloudflare
1. Login → Select domain
2. Go to **DNS** tab
3. Click **"Add record"**
4. Add each record, save

#### Google Domains
1. Login → Select domain
2. Go to **DNS** tab
3. Scroll to **Custom records**
4. Add each record

#### GoDaddy
1. Login → My Products → Domains
2. Click **"DNS"** next to your domain
3. Scroll to **Records**
4. Click **"Add"** for each record

### Step 4: Verify Domain

1. Wait 5-60 minutes for DNS propagation
2. Go back to Brevo dashboard
3. Click **"Check authentication status"**
4. If successful, you'll see green checkmarks ✅

### Step 5: Add Sender Email

1. Go to https://app.brevo.com/settings/keys/smtp
2. Under "Senders", click **"Add a new sender"**
3. Enter your domain email (e.g., `noreply@mathgameapp.com`)
4. Since domain is verified, it will be approved instantly

Popular sender email addresses:
- `noreply@yourdomain.com` (transactional emails)
- `hello@yourdomain.com` (general)
- `team@yourdomain.com` (friendly)
- `verify@yourdomain.com` (specific purpose)

### Step 6: Update Environment Variables

```env
BREVO_API_KEY=xkeysib-your_api_key_here
BREVO_FROM_EMAIL=noreply@yourdomain.com
BREVO_FROM_NAME=Math Game App
BASE_URL=https://your-app.onrender.com
```

---

## Sending Promotional Emails (Campaigns)

Brevo's free tier includes marketing automation! Perfect for game events.

### Creating Your First Campaign

1. Go to https://app.brevo.com/camp/lists
2. Create a contact list (e.g., "Game Players")
3. Go to **Campaigns** → **Email**
4. Click **"Create a campaign"**
5. Choose a template or design your own
6. Add your content
7. Schedule or send immediately

### Best Practices for Game Events

**Example Campaign Ideas:**
- New game mode announcements
- Special event notifications (holidays, competitions)
- Achievement milestones
- Weekly leaderboard updates
- Exclusive rewards for email subscribers

**Tips:**
- **Subject Line:** Keep it exciting! "🎮 New Challenge Mode Unlocked!"
- **Timing:** Send between 2-8 PM in your users' timezone
- **Frequency:** Max 1-2 promotional emails per week
- **Content:** Include images, clear CTA buttons
- **Mobile-First:** Most users will read on mobile

### Adding Users to Campaign Lists

You can add users to your campaign list in two ways:

#### Method 1: Manual Import
1. Export emails from your database
2. Go to **Contacts** → **Import contacts**
3. Upload CSV file

#### Method 2: API Integration (Automated)
Add this to your server after user signs up:

```javascript
// Add to emailService.js
async addToMarketingList(email, userName) {
  const ContactsApi = new brevo.ContactsApi();
  const apiKeyAuth = ContactsApi.authentications['apiKey'];
  apiKeyAuth.apiKey = process.env.BREVO_API_KEY;

  try {
    const createContact = new brevo.CreateContact();
    createContact.email = email;
    createContact.attributes = {
      FIRSTNAME: userName,
      GAME_JOINED_DATE: new Date().toISOString()
    };
    createContact.listIds = [2]; // Your list ID from Brevo

    await ContactsApi.createContact(createContact);
    console.log(`[EmailService] Added ${email} to marketing list`);
  } catch (error) {
    console.error('[EmailService] Failed to add to marketing list:', error.message);
  }
}
```

### Unsubscribe Handling

Brevo automatically adds unsubscribe links to campaign emails (required by law). Users who unsubscribe will:
- Still receive transactional emails (verification, password resets)
- Not receive campaign/promotional emails

---

## Troubleshooting

### "Invalid API Key"

**Problem:** API key not working.

**Solutions:**
1. Check for typos in environment variable
2. Make sure you copied the full key (starts with `xkeysib-`)
3. Regenerate a new API key if needed
4. Restart your server after adding the key

### "Sender not verified"

**Problem:** Can't send emails, sender not authorized.

**Solutions:**
1. Go to https://app.brevo.com/settings/keys/smtp
2. Check if your sender email is in the "Senders" list
3. If not, add it and verify
4. Make sure `BREVO_FROM_EMAIL` matches exactly

### "Daily sending limit reached"

**Problem:** Hit 300 emails/day limit on free tier.

**Solutions:**
1. **Upgrade to paid plan** ($25/month for 20,000 emails)
2. **Optimize emails:** Reduce verification email resends
3. **Batch promotional emails:** Schedule them across multiple days
4. **Monitor usage:** Check dashboard regularly

### "Emails going to spam"

**Problem:** Emails arrive in spam folder.

**Solutions:**
1. **Authenticate your domain** (add all DNS records)
2. **Avoid spam trigger words** in subject lines:
   - ❌ FREE!, URGENT!, ACT NOW!
   - ✅ Your verification code, Reset your password
3. **Include unsubscribe link** (automatic in campaigns)
4. **Build sender reputation:** Start with low volume, increase gradually
5. **Ask initial users to whitelist:** Mark as "not spam"

### "DNS records not verified"

**Problem:** Domain authentication failing.

**Solutions:**
1. **Wait longer** - DNS can take up to 48 hours (usually 5-30 min)
2. **Check for typos** - Copy-paste values exactly
3. **Check record format** - Some registrars need full domain in name
4. **Use DNS checker:** https://mxtoolbox.com/SuperTool.aspx
5. **Contact support** - Brevo support is very responsive

---

## Cost Breakdown

### Free Tier (Perfect for Starting)
- **300 emails/day** (9,000/month)
- Unlimited contacts
- Email campaigns
- SMS (100 credits)
- Marketing automation
- 1 user

### Starter Plan ($25/month)
- **20,000 emails/month**
- Remove Brevo logo
- Basic reporting
- A/B testing
- 3 users

### Business Plan ($65/month)
- **100,000 emails/month**
- Marketing automation
- Advanced statistics
- Multi-user access
- Phone support

**For Math Game App:**
- Start with **Free tier** (300 emails/day is plenty)
- Upgrade to **Starter** when you exceed daily limits
- Most apps stay on Free tier for months!

---

## Monitoring & Analytics

### Email Statistics Dashboard

1. Go to https://app.brevo.com/statistics/email
2. View:
   - Delivery rate
   - Open rate
   - Click rate
   - Bounce rate
   - Unsubscribe rate

### Key Metrics to Watch

**For Transactional Emails (Verification/Reset):**
- **Delivery rate:** Should be >99%
- **Open rate:** 40-60% (some users auto-verify)
- **Click rate:** 30-50% (users clicking verification link)
- **Bounce rate:** Should be <1%

**For Promotional Campaigns:**
- **Open rate:** 15-25% is good for gaming apps
- **Click rate:** 5-15% is solid
- **Unsubscribe rate:** Keep below 0.5%

### Setting Up Webhooks (Optional)

Track email events in real-time:

1. Go to https://app.brevo.com/settings/webhooks
2. Add your webhook URL (e.g., `https://your-app.com/api/email-webhook`)
3. Select events to track:
   - Email delivered
   - Email opened
   - Link clicked
   - Bounced
   - Spam report

---

## Best Practices

### Email Content Guidelines

✅ **Do:**
- Use clear, concise subject lines
- Include your app name and branding
- Provide both HTML and plain text versions (Brevo does this automatically)
- Add clear call-to-action buttons
- Keep emails mobile-friendly
- Include unsubscribe link (required for campaigns)

❌ **Don't:**
- Use ALL CAPS in subjects
- Include too many links (looks spammy)
- Use spam trigger words
- Send from generic addresses (info@, admin@)
- Send too frequently (max 2 emails/week for campaigns)

### Sender Reputation

- **Start slow:** Don't send 1000s of emails on day 1
- **Monitor bounces:** Remove invalid emails
- **Handle complaints:** Respect unsubscribes immediately
- **Engage users:** High open rates = better reputation
- **Warm up domain:** Gradually increase send volume over 2-4 weeks

### GDPR Compliance (if applicable)

If you have EU users:
- Get explicit consent before sending marketing emails
- Provide easy unsubscribe
- Honor data deletion requests
- Keep records of consent

---

## Environment Variables Summary

### Development/Testing
```env
BREVO_API_KEY=xkeysib-abc123...
BREVO_FROM_EMAIL=your-email@gmail.com
BREVO_FROM_NAME=Math Game App
BASE_URL=http://localhost:3000
```

### Production (Custom Domain)
```env
BREVO_API_KEY=xkeysib-abc123...
BREVO_FROM_EMAIL=noreply@yourdomain.com
BREVO_FROM_NAME=Math Game App
BASE_URL=https://your-app.onrender.com
```

---

## Migration from Resend

If you're migrating from Resend, the process is simple:

1. ✅ Install Brevo package (already done)
2. ✅ Update email service code (already done)
3. ⚠️ Update environment variables:
   - Remove: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
   - Add: `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`
4. ✅ Test email sending
5. ⚠️ (Optional) You can keep Resend package in case you want to switch back

**No database changes needed!** Email tokens and user data remain the same.

---

## Quick Checklist

### Initial Setup (5 minutes)
- [ ] Create Brevo account
- [ ] Generate API key
- [ ] Add a sender email (verify)
- [ ] Add `BREVO_API_KEY` to server env variables
- [ ] Add `BREVO_FROM_EMAIL` to server env variables
- [ ] Add `BREVO_FROM_NAME` to server env variables
- [ ] Test email sending with a test account

### Production Setup (Optional)
- [ ] Own/purchase domain
- [ ] Authenticate domain in Brevo
- [ ] Add SPF DNS record
- [ ] Add DKIM DNS record
- [ ] Wait for DNS propagation (5-60 min)
- [ ] Verify domain status
- [ ] Add sender email with your domain
- [ ] Update `BREVO_FROM_EMAIL` with domain email
- [ ] Test in production
- [ ] Monitor email statistics

### Promotional Campaigns Setup (Optional)
- [ ] Create contact list
- [ ] Import initial contacts
- [ ] Design first campaign template
- [ ] Schedule first campaign
- [ ] Monitor open/click rates
- [ ] Set up automation workflows

---

## Support Resources

- **Brevo Documentation**: https://developers.brevo.com/
- **API Reference**: https://developers.brevo.com/reference/getting-started-1
- **Help Center**: https://help.brevo.com/
- **Status Page**: https://status.brevo.com/
- **Support Email**: contact@brevo.com (usually responds within 24 hours)
- **Community Forum**: https://community.sendinblue.com/

---

## Next Steps

1. **Get your API key** from https://app.brevo.com/settings/keys/api
2. **Add sender email** at https://app.brevo.com/settings/keys/smtp
3. **Add environment variables** to your server
4. **Deploy and test** with a test account
5. **(Optional) Set up custom domain** when ready for production
6. **(Optional) Create first promotional campaign** for game events

**Estimated setup time:**
- Basic setup: **5 minutes**
- Custom domain: **30-60 minutes** (including DNS wait time)
- First campaign: **15 minutes**

Need help? Check the troubleshooting section or reach out to Brevo support!
