# Authentication Setup Guide

This guide will help you set up all authentication methods for your Math Game App.

## Table of Contents
1. [Google Sign-In](#google-sign-in)
2. [Facebook Login](#facebook-login)
3. [Google Play Games](#google-play-games)
4. [Apple Sign-In](#apple-sign-in) (Already configured)

---

## Google Sign-In

### Prerequisites
- Google Cloud Console account
- Android Studio (for getting SHA-1 certificate)

### Setup Steps

#### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google+ API** and **Google Sign-In API**

#### 2. Create OAuth 2.0 Credentials

**For Android:**
1. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
2. Select **Android**
3. Get your SHA-1 certificate fingerprint:
   ```bash
   # Debug keystore (for development)
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # For Windows:
   keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
4. Enter your package name: `com.anonymous.MathGameApp` (check app.json)
5. Enter the SHA-1 fingerprint
6. Create the credential

**For iOS:**
1. Create another OAuth client ID for iOS
2. Select **iOS**
3. Enter your bundle identifier from app.json
4. Create the credential

**For Web (Required):**
1. Create a **Web application** OAuth client ID
2. This is your `webClientId` that you'll use in the code
3. Save the Client ID

#### 3. Configure app.json
Add to your `app.json`:
```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

#### 4. Download Configuration Files
- **Android**: Download `google-services.json` and place in project root
- **iOS**: Download `GoogleService-Info.plist` and place in project root

#### 5. Update AuthService.ts
Replace in `services/AuthService.ts`:
```typescript
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // From step 2
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // Optional
  offlineAccess: false,
});
```

---

## Facebook Login

### Prerequisites
- Facebook Developer account
- Facebook App

### Setup Steps

#### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing
3. Add **Facebook Login** product
4. Select **iOS** and **Android** as platforms

#### 2. Configure Android
1. In Facebook Dashboard → Settings → Basic:
   - Add Package Name: `com.anonymous.MathGameApp`
   - Add Class Name: `com.anonymous.MathGameApp.MainActivity`

2. Get your key hash:
   ```bash
   # For macOS/Linux:
   keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
   
   # For Windows (use Git Bash):
   keytool -exportcert -alias androiddebugkey -keystore %USERPROFILE%\.android\debug.keystore | openssl sha1 -binary | openssl base64
   ```
   Default password: `android`

3. Add the key hash to Facebook Dashboard

#### 3. Configure iOS
1. Add your Bundle ID from app.json
2. Enable Single Sign-On

#### 4. Configure app.json
Add to your `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "react-native-fbsdk-next",
        {
          "appID": "YOUR_FACEBOOK_APP_ID",
          "clientToken": "YOUR_CLIENT_TOKEN",
          "displayName": "Math Game App",
          "scheme": "fbYOUR_FACEBOOK_APP_ID"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "FacebookAppID": "YOUR_FACEBOOK_APP_ID",
        "FacebookDisplayName": "Math Game App"
      }
    }
  }
}
```

#### 5. Get App ID and Client Token
- **App ID**: Found in Dashboard → Settings → Basic
- **Client Token**: Found in Dashboard → Settings → Advanced → Security

---

## Google Play Games

### Prerequisites
- Google Play Console account
- Published or uploaded app (even as draft)

### Setup Steps

#### 1. Set Up Play Games Services
1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Play Games Services** → **Setup and management** → **Configuration**
4. Create a new Game

#### 2. Link OAuth 2.0 Credentials
1. Link the same OAuth 2.0 client ID from Google Sign-In setup
2. Add test accounts for development

#### 3. Configure Achievements & Leaderboards (Optional)
1. In Play Console → Play Games Services:
   - Create achievements
   - Create leaderboards
2. Note the IDs for use in your game

#### 4. Update Code
The code already uses Google Sign-In with Play Games scopes. Just update the `webClientId` as in Google Sign-In setup.

---

## Testing Authentication

### Test Each Method:

1. **Google Sign-In**:
   ```bash
   # Build development version
   npx expo run:android
   # or
   npx expo run:ios
   ```

2. **Facebook Login**:
   - Add test users in Facebook Dashboard
   - Test with development build

3. **Google Play Games**:
   - Add test accounts in Play Console
   - Only works on real devices (not simulator)

### Debugging Tips:

**Google Sign-In Issues:**
- Verify SHA-1 certificate matches
- Check package name matches app.json
- Ensure APIs are enabled in Google Cloud Console

**Facebook Login Issues:**
- Verify key hash matches
- Check App ID in app.json
- Ensure app is in Development mode in Facebook Dashboard

**General Issues:**
- Clear app data and reinstall
- Check expo-dev-client is installed: `npx expo install expo-dev-client`
- Build development client: `npx expo run:android` or `npx expo run:ios`

---

## Important Notes

### Development vs Production

**Development:**
- Use debug keystores
- Apps can be in development mode
- Test accounts work

**Production:**
- Use release keystores
- Generate new SHA-1 for release keystore
- Update Facebook key hash for release
- Submit apps for review where required

### EAS Build Configuration

If using EAS Build, add to `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

---

## Quick Reference

### Package Names & Bundle IDs
- **Android Package**: Check in `app.json` → `android.package`
- **iOS Bundle ID**: Check in `app.json` → `ios.bundleIdentifier`

### Getting Certificate Fingerprints
```bash
# Debug SHA-1 (Android)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Facebook Key Hash (Android)
keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
```

### Common Client IDs Format
- **Web Client ID**: `XXXXX.apps.googleusercontent.com`
- **Android Client ID**: `XXXXX.apps.googleusercontent.com`
- **iOS Client ID**: `XXXXX.apps.googleusercontent.com`
- **Facebook App ID**: Numeric (e.g., `1234567890123456`)

---

## Support Resources

- [Google Sign-In Docs](https://github.com/react-native-google-signin/google-signin)
- [Facebook SDK Docs](https://github.com/thebergamo/react-native-fbsdk-next)
- [Expo Authentication](https://docs.expo.dev/guides/authentication/)
- [Google Play Games Services](https://developers.google.com/games/services)

---

## Next Steps

After setting up authentication:
1. Test each sign-in method on both platforms
2. Configure proper error handling
3. Set up analytics to track sign-in methods
4. Implement account linking (optional)
5. Add privacy policy and terms of service

