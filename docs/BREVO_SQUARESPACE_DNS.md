# Adding Brevo DNS Records to Squarespace

## Step-by-Step Guide for Squarespace DNS Configuration

### Step 1: Get Your Brevo DNS Records

1. Go to https://app.brevo.com/settings/keys/smtp
2. Click **"Authenticate your domain"**
3. Enter your domain (e.g., `yourdomain.com`)
4. Brevo will show you 3 records to copy:
   - **Brevo Code (TXT record)**
   - **DKIM (TXT record)**
   - **DMARC (TXT record)** (optional but recommended)

**Keep this page open** - you'll need to copy these values!

---

### Step 2: Access Squarespace DNS Settings

1. Go to https://account.squarespace.com/domains
2. Click on your domain name
3. Click **"DNS Settings"** or **"Advanced Settings"**
4. Click **"Custom Records"** or **"Add Record"**

**Note:** If you see a message that your domain is connected to Google Workspace, that's fine! You'll be adding additional records alongside the existing Google records.

---

### Step 3: Add Brevo Code (SPF/TXT Record)

This is the first record Brevo shows you.

1. Click **"Add Record"**
2. Select **"TXT"** as the record type
3. Fill in the fields:
   - **Host/Name:** `@` (or leave blank - means root domain)
   - **Data/Value:** Copy the Brevo code exactly
     - Should look like: `v=spf1 include:spf.sendinblue.com mx ~all`
   - **TTL:** Leave default (usually 3600)

**IMPORTANT - Google Workspace SPF Conflict:**

If you already have an SPF record for Google Workspace (like `v=spf1 include:_spf.google.com ~all`), you need to **merge** them instead of adding a second one:

**Original Google Workspace SPF:**
```
v=spf1 include:_spf.google.com ~all
```

**Combined Google + Brevo SPF:**
```
v=spf1 include:_spf.google.com include:spf.sendinblue.com ~all
```

To update the existing SPF record:
1. Find the existing TXT record that starts with `v=spf1`
2. Click **"Edit"** on that record
3. Add `include:spf.sendinblue.com` before `~all`
4. Save

**Example of correct merged SPF record:**
```
Host: @
Value: v=spf1 include:_spf.google.com include:spf.sendinblue.com ~all
```

4. Click **"Save"** or **"Add"**

---

### Step 4: Add DKIM Record (TXT Record)

This is the second record Brevo shows you.

1. Click **"Add Record"**
2. Select **"TXT"** as the record type
3. Fill in the fields:
   - **Host/Name:** `mail._domainkey` (exactly as Brevo shows)
   - **Data/Value:** Copy the long DKIM string from Brevo
     - Starts with something like: `v=DKIM1; k=rsa; p=MIGfMA0GCS...`
     - This will be a very long string - copy it exactly!
   - **TTL:** Leave default

**Squarespace Tip:** Some versions of Squarespace automatically add your domain to the Host field. If you see:
- Field shows: `mail._domainkey.yourdomain.com` ← This is correct
- Or just enter: `mail._domainkey` ← Squarespace will add the domain

4. Click **"Save"** or **"Add"**

---

### Step 5: Add DMARC Record (TXT Record) - Optional but Recommended

This is the third record Brevo shows you.

1. Click **"Add Record"**
2. Select **"TXT"** as the record type
3. Fill in the fields:
   - **Host/Name:** `_dmarc`
   - **Data/Value:** `v=DMARC1; p=none; rua=mailto:your-email@yourdomain.com`
     - Replace `your-email@yourdomain.com` with your actual email
   - **TTL:** Leave default

**Alternative simple DMARC (if Brevo doesn't provide one):**
```
v=DMARC1; p=none;
```

4. Click **"Save"** or **"Add"**

---

### Step 6: Review Your DNS Records

After adding all records, your DNS settings should look like this:

```
Type | Host              | Value
-----|-------------------|------------------------------------------
TXT  | @                 | v=spf1 include:_spf.google.com include:spf.sendinblue.com ~all
TXT  | mail._domainkey   | v=DKIM1; k=rsa; p=MIGfMA0GCS... (long string)
TXT  | _dmarc            | v=DMARC1; p=none;
```

**Plus your existing Google Workspace records** (MX, CNAME, etc.) - don't delete those!

---

### Step 7: Verify in Brevo

1. Wait **5-30 minutes** for DNS to propagate (sometimes up to 2 hours)
2. Go back to Brevo: https://app.brevo.com/settings/keys/smtp
3. Click **"Check authentication status"** or **"Verify DNS Records"**
4. You should see green checkmarks ✅ for each record

---

## Troubleshooting

### "Domain doesn't show in Squarespace"

**Problem:** You can't see your domain in Squarespace domains list.

**Solutions:**
1. **Check if it's in Google Domains:**
   - Go to https://domains.google.com
   - Check if your domain is listed there
   - If yes, you need to manage DNS through Google Domains

2. **Transfer DNS management:**
   - If the domain is in Google Workspace but managed by Squarespace:
   - Go to https://domains.squarespace.com
   - Login with your Squarespace account
   - Your domain should appear there

3. **Contact Squarespace support:**
   - Live chat: https://support.squarespace.com
   - They can help locate your domain

### "DNS Records Not Updating"

**Problem:** Added records but Brevo can't verify them.

**Solutions:**
1. **Wait longer** - DNS can take up to 48 hours (usually 5-30 min)
2. **Check for typos** - Copy-paste values exactly from Brevo
3. **Verify with DNS checker:**
   - Go to: https://mxtoolbox.com/SuperTool.aspx
   - Enter: `yourdomain.com` (for SPF)
   - Enter: `mail._domainkey.yourdomain.com` (for DKIM)
   - Enter: `_dmarc.yourdomain.com` (for DMARC)
4. **Clear browser cache** and refresh Brevo page

### "Multiple SPF Records Not Allowed"

**Problem:** Error saying "Multiple SPF records found"

**Solutions:**
1. You can only have **ONE** SPF record
2. **Merge** Google Workspace + Brevo into one record:
   ```
   v=spf1 include:_spf.google.com include:spf.sendinblue.com ~all
   ```
3. Delete the separate Brevo SPF record
4. Edit the existing Google SPF record to include Brevo

### "Record Name Already Exists"

**Problem:** Squarespace says the record already exists.

**Solutions:**
1. **For SPF:** Edit the existing record instead of adding new one
2. **For DKIM:** Make sure you're using `mail._domainkey` not just `mail`
3. **For DMARC:** Check if you already have a DMARC record and edit it

### "Can't Find DNS Settings in Squarespace"

**Squarespace 7.0:**
1. Home → Settings → Domains
2. Click your domain
3. Click "Advanced Settings"
4. Click "Custom Records"

**Squarespace 7.1:**
1. Settings → Domains
2. Click your domain name
3. Click "DNS Settings"
4. Scroll to "Custom Records"

---

## Quick Reference: Squarespace DNS Record Format

### Brevo Code (SPF) - Merged with Google Workspace
```
Type: TXT
Host: @
Data: v=spf1 include:_spf.google.com include:spf.sendinblue.com ~all
```

### DKIM
```
Type: TXT
Host: mail._domainkey
Data: [paste the long DKIM string from Brevo exactly]
```

### DMARC
```
Type: TXT
Host: _dmarc
Data: v=DMARC1; p=none;
```

---

## Visual Guide

### What Your Squarespace DNS Should Look Like:

**Before (Google Workspace only):**
```
MX    @    1    aspmx.l.google.com
MX    @    5    alt1.aspmx.l.google.com
...
TXT   @         v=spf1 include:_spf.google.com ~all
```

**After (Google Workspace + Brevo):**
```
MX    @                 1    aspmx.l.google.com
MX    @                 5    alt1.aspmx.l.google.com
...
TXT   @                      v=spf1 include:_spf.google.com include:spf.sendinblue.com ~all
TXT   mail._domainkey        v=DKIM1; k=rsa; p=MIGfMA0GCS... [long string]
TXT   _dmarc                 v=DMARC1; p=none;
```

---

## After DNS Verification

Once Brevo shows green checkmarks:

1. **Add sender email** in Brevo:
   - Go to https://app.brevo.com/settings/keys/smtp
   - Under "Senders", click "Add a new sender"
   - Enter: `noreply@yourdomain.com` (or your preferred email)
   - It will be instantly verified (because domain is authenticated)

2. **Update environment variables:**
   ```env
   BREVO_FROM_EMAIL=noreply@yourdomain.com
   BREVO_FROM_NAME=Math Game App
   ```

3. **Test sending:**
   - Deploy your server
   - Create a test account
   - Verify email arrives from your custom domain!

---

## Need Help?

### Squarespace Support
- Live Chat: https://support.squarespace.com
- Help Center: https://support.squarespace.com/hc/en-us/articles/205812348-Custom-DNS-records

### Brevo Support
- Email: contact@brevo.com
- Help: https://help.brevo.com/

### Check DNS Propagation
- MXToolbox: https://mxtoolbox.com/SuperTool.aspx
- DNS Checker: https://dnschecker.org/

---

## Summary Checklist

- [ ] Get Brevo DNS records (SPF, DKIM, DMARC)
- [ ] Login to Squarespace domains
- [ ] Find existing SPF record and merge with Brevo SPF
- [ ] Add DKIM TXT record (mail._domainkey)
- [ ] Add DMARC TXT record (_dmarc)
- [ ] Save all records
- [ ] Wait 5-30 minutes
- [ ] Verify in Brevo dashboard
- [ ] Add sender email in Brevo
- [ ] Update server environment variables
- [ ] Test email sending

Good luck! The DNS propagation usually takes 5-30 minutes, so grab a coffee and check back soon.
