# iOS App Store Submission Guide

Complete guide to submitting your Math Game app to the Apple App Store.

---

## Prerequisites Checklist

Before you start, make sure you have:

- [ ] **Apple Developer Account** ($99/year)
  - Sign up at: https://developer.apple.com/programs/
  - Requires business day for approval
  
- [ ] **App built with EAS** 
  - `eas build --platform ios`
  - Build should be successful
  
- [ ] **App tested on TestFlight** (recommended)
  - Test all features work
  - Get feedback from beta testers

- [ ] **Required Assets Ready**
  - App icon (1024x1024px)
  - Screenshots (various sizes)
  - App description
  - Privacy policy URL (if collecting data)

---

## Part 1: Apple Developer Account Setup

### Step 1: Enroll in Apple Developer Program

1. Go to https://developer.apple.com/programs/enroll/
2. Click **"Start Your Enrollment"**
3. Sign in with your Apple ID
4. Complete enrollment form
5. Pay $99 annual fee
6. Wait for approval (usually 24-48 hours)

### Step 2: Create App Store Connect Record

1. Go to https://appstoreconnect.apple.com
2. Sign in with your Apple Developer account
3. Click **"My Apps"**
4. Click the **+** button → **"New App"**
5. Fill in details:
   - **Platform**: iOS
   - **Name**: MathGameApp (or your chosen name)
   - **Primary Language**: English
   - **Bundle ID**: Select `com.nickkopel.MathGameApp`
   - **SKU**: `mathgameapp` (unique identifier)
   - **User Access**: Full Access

---

## Part 2: Prepare App Assets

### Required Screenshots

You need screenshots for various iPhone sizes:

**iPhone 6.7" Display (iPhone 15 Pro Max, 14 Pro Max, etc.)**
- Size: 1290 x 2796 pixels
- Need: 3-10 screenshots

**iPhone 6.5" Display (iPhone 11 Pro Max, XS Max, etc.)**
- Size: 1242 x 2688 pixels
- Need: 3-10 screenshots

**iPhone 5.5" Display (iPhone 8 Plus, 7 Plus, etc.)**
- Size: 1242 x 2208 pixels
- Need: 3-10 screenshots

**Tips for Screenshots:**
- Show your best features first
- Highlight: Game modes, multiplayer, friends system
- Include captions explaining features
- Keep text readable

**How to Get Screenshots:**
1. Run app on iOS Simulator (largest iPhone model)
2. Press `Cmd + S` to save screenshot
3. Use design tool (Figma, Canva) to add captions/frames
4. Or use screenshot builder tools online

### App Icon

- **Size**: 1024 x 1024 pixels
- **Format**: PNG (no transparency)
- **Current icon**: Located at `assets/icon.png`
- Make sure it looks good at all sizes

### App Preview Video (Optional but Recommended)

- 15-30 seconds showing gameplay
- Up to 3 videos per localization
- Sizes: Same as screenshot sizes
- Format: .mov, .mp4, or .m4v

---

## Part 3: App Information

### App Name & Subtitle

- **App Name**: "Math Game" or "Math Battle"
  - Max 30 characters
  - Searchable, memorable
  
- **Subtitle**: "Challenge Your Math Skills"
  - Max 30 characters
  - Appears below app name in search

### Description

Write compelling description (max 4000 characters):

```
Example:

Master math while having fun! Math Game is the ultimate math practice app with exciting game modes:

🎯 CLASSIC MODE
Race against the clock to solve as many problems as you can!

🤖 BOT BATTLE
Challenge AI opponents of different skill levels.

👥 LOCAL MULTIPLAYER
Play head-to-head on the same device with friends and family.

🌐 ONLINE MULTIPLAYER
Connect with players worldwide and compete in real-time matches!

👫 FRIENDS SYSTEM
Add friends, see who's online, and challenge them to math battles.

✨ FEATURES
• Multiple difficulty levels (Easy, Medium, Hard)
• Track your progress and stats
• Earn coins and unlock rewards
• Beautiful themes and backgrounds
• Safe and fun for all ages

Perfect for students, parents, and anyone who loves math!

Download now and start your math adventure! 🚀
```

### Keywords

Max 100 characters, comma-separated:
```
math,game,education,learning,kids,children,multiplication,addition,practice,quiz,challenge,multiplayer
```

### Categories

- **Primary**: Education
- **Secondary**: Games

### Age Rating

Based on your app content:
- **4+** (No objectionable content)

### Privacy Policy

**Required if you collect any data.**

Your app collects:
- Email addresses (for authentication)
- Usernames
- Game statistics
- Friend connections

Create a simple privacy policy:

**Option 1: Use a Generator**
- https://www.privacypolicygenerator.info/
- https://app-privacy-policy-generator.firebaseapp.com/

**Option 2: Basic Template**

```
Privacy Policy for Math Game

Last updated: [Date]

We collect:
- Email addresses for account creation
- Usernames and game statistics
- Friend connections

We do not:
- Share your data with third parties
- Sell your information
- Track you across other apps

Data is stored securely and used only to provide app functionality.

Contact: [Your Email]
```

Host this on:
- GitHub Pages (free)
- Your own website
- Google Sites (free)

**Example URL**: `https://yourusername.github.io/mathgame-privacy`

### Support URL

Provide a way for users to contact you:
- Your website
- GitHub repo
- Email: `mailto:youremail@example.com`

---

## Part 4: Build & Upload

### Step 1: Configure App for Production

Make sure these are set:

**app.json:**
```json
{
  "expo": {
    "version": "1.7.0",
    "ios": {
      "bundleIdentifier": "com.nickkopel.MathGameApp",
      "buildNumber": "1",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    }
  }
}
```

### Step 2: Build with EAS

```bash
eas build --platform ios --profile production
```

Wait for build to complete (~15-20 minutes).

### Step 3: Submit to App Store

After build completes:

```bash
eas submit --platform ios
```

Or manually:
1. Download .ipa file from EAS
2. Use Transporter app to upload
3. Available at: https://apps.apple.com/app/transporter/id1450874784

---

## Part 5: App Store Connect Configuration

### Step 1: Add Build

1. Go to App Store Connect → Your App
2. Go to **"TestFlight"** tab
3. Wait for build to appear (5-10 minutes after upload)
4. Once processed, it appears under **"iOS Builds"**

### Step 2: Complete App Information

1. Click **"App Store"** tab
2. Click **"+ Version"** or select existing version
3. Fill in all required fields:

**What's New in This Version:**
```
• Online multiplayer with friends
• Real-time math battles
• Friend system with online status
• Multiple game modes
• Performance improvements
```

**Promotional Text** (optional, max 170 chars):
```
Challenge friends to math battles! New online multiplayer mode now available.
```

4. Upload screenshots (all required sizes)
5. Upload app icon
6. Set age rating
7. Add privacy policy URL
8. Add support URL

### Step 3: App Review Information

- **Sign-in required?** YES
  - Provide demo account credentials:
    - Email: `demo@example.com`
    - Password: `DemoPass123!`
  - Or enable offline mode for review

- **Contact Information**:
  - Your name
  - Phone number
  - Email address

- **Notes for Reviewer**:
```
This is a math education game with multiplayer features.

Demo Account (if needed):
Email: demo@example.com
Password: DemoPass123!

Or use "Continue as Guest" to test offline mode.

Multiplayer requires internet connection.
Server is hosted on Render.com.
```

### Step 4: Pricing & Availability

- **Price**: Free (or set price)
- **Availability**: All countries/regions
- **App Store Distribution**: Public

### Step 5: Submit for Review

1. Review all information
2. Click **"Add for Review"**
3. Click **"Submit to App Review"**

---

## Part 6: App Review Process

### What to Expect

1. **Waiting for Review**: 1-3 days typically
2. **In Review**: Few hours to 1 day
3. **Outcomes**:
   - ✅ **Approved** - App goes live!
   - ⚠️ **Rejected** - Fix issues and resubmit

### Common Rejection Reasons

1. **Incomplete App Information**
   - Solution: Fill all required fields

2. **Crashes on Launch**
   - Solution: Test thoroughly before submission

3. **Missing Privacy Policy**
   - Solution: Add privacy policy URL

4. **Demo Account Issues**
   - Solution: Provide working credentials or offline mode

5. **Guideline Violations**
   - Solution: Review Apple's guidelines carefully

### If Rejected

1. Read rejection message carefully
2. Fix all mentioned issues
3. Reply to reviewer if needed
4. Increment build number
5. Rebuild and resubmit

---

## Part 7: Post-Approval

### When Approved

1. App status changes to **"Ready for Sale"**
2. You'll receive email notification
3. App appears on App Store within 24 hours
4. Search: https://apps.apple.com

### Monitor Your App

- Check ratings and reviews
- Respond to user feedback
- Track downloads in App Store Connect
- Monitor crash reports

### Future Updates

When you have updates:

1. Update version in `app.json`:
```json
"version": "1.8.0"
```

2. Build new version:
```bash
eas build --platform ios
```

3. Submit to App Store:
```bash
eas submit --platform ios
```

4. Update "What's New" section in App Store Connect
5. Submit for review

---

## Quick Checklist Before Submission

- [ ] Apple Developer account active
- [ ] App Store Connect record created
- [ ] Bundle ID matches (`com.nickkopel.MathGameApp`)
- [ ] Version number updated
- [ ] All screenshots prepared (multiple sizes)
- [ ] App icon ready (1024x1024)
- [ ] Privacy policy URL added
- [ ] Support URL added
- [ ] App description written
- [ ] Keywords added
- [ ] Age rating set
- [ ] Demo account ready (or offline mode works)
- [ ] App built with EAS successfully
- [ ] Tested on TestFlight
- [ ] All features working
- [ ] Server is online (Render)
- [ ] MongoDB is connected

---

## Helpful Resources

- **App Store Connect**: https://appstoreconnect.apple.com
- **Apple Developer**: https://developer.apple.com
- **App Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Screenshot Sizes**: https://help.apple.com/app-store-connect/#/devd274dd925
- **EAS Submit Docs**: https://docs.expo.dev/submit/ios/

---

## Timeline Estimate

- **Build app**: 15-20 minutes
- **Prepare assets**: 1-2 hours
- **Fill App Store Connect**: 30-60 minutes
- **App review**: 1-3 days
- **Total**: ~3-4 days from submission to approval

---

## Tips for Success

1. **Test thoroughly** before submission
2. **Use TestFlight** to catch bugs early
3. **Provide clear demo account** or offline mode
4. **Write detailed notes** for reviewer
5. **Respond quickly** to rejection messages
6. **Be patient** - first submission can take longer
7. **Check App Store guidelines** before submitting

---

## Need Help?

- Apple Support: https://developer.apple.com/contact/
- Expo Forums: https://forums.expo.dev/
- App Store Connect Help: In-app help button

Good luck with your submission! 🎉📱

