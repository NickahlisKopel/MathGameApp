import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export type AuthProvider = 
  | 'offline' 
  | 'google' 
  | 'facebook' 
  | 'apple' 
  | 'game-center' 
  | 'google-play' 
  | 'email';

export interface AuthUser {
  id: string;
  displayName: string;
  email?: string;
  provider: AuthProvider;
  isOffline: boolean;
  photoUrl?: string;
}

const AUTH_STORAGE_KEY = '@auth_user';

class AuthService {
  private currentUser: AuthUser | null = null;

  /**
   * Initialize auth service and restore previous session
   */
  async initialize(): Promise<AuthUser | null> {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const user: AuthUser = JSON.parse(stored);
        
        // Verify email accounts still exist
        if (user.provider === 'email') {
          const EMAIL_ACCOUNTS_KEY = '@email_accounts';
          const accountsData = await AsyncStorage.getItem(EMAIL_ACCOUNTS_KEY);
          
          if (accountsData) {
            const accounts = JSON.parse(accountsData);
            const emailKey = user.email?.toLowerCase();
            
            if (!emailKey || !accounts[emailKey]) {
              // Account was deleted, clear session
              console.log('[Auth] Email account no longer exists, clearing session');
              await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
              return null;
            }
          } else {
            // No accounts exist, clear session
            console.log('[Auth] No email accounts found, clearing session');
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
            return null;
          }
        }
        
        this.currentUser = user;
        return this.currentUser;
      }
    } catch (error) {
      console.error('Failed to restore auth session:', error);
    }
    return null;
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Sign in with offline/guest mode
   */
  async signInOffline(displayName?: string): Promise<AuthUser> {
    const guestId = await this.getOrCreateGuestId();
    const user: AuthUser = {
      id: guestId,
      displayName: displayName || 'Guest Player',
      provider: 'offline',
      isOffline: true,
    };

    await this.saveUser(user);
    return user;
  }

  /**
   * Sign in with Google
   * 
   * SETUP INSTRUCTIONS:
   * 1. Go to https://console.cloud.google.com/
   * 2. Create a new project or select existing
   * 3. Enable Google+ API
   * 4. Go to Credentials → Create OAuth 2.0 Client IDs
   * 5. For Android: Add your app's package name and SHA-1 certificate fingerprint
   *    Get SHA-1: Run `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
   * 6. For iOS: Add your bundle identifier
   * 7. Download the configuration files and add Client IDs below
   */
//   async signInWithGoogle(): Promise<AuthUser> {
//     try {
//       const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      
//       // Configure Google Sign-In
//       // Replace these with your actual Client IDs from Google Cloud Console
//       GoogleSignin.configure({
//         webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // From Google Cloud Console
//         iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // Optional, for iOS
//         offlineAccess: false,
//       });

//       // Check if device supports Google Play Services
//       await GoogleSignin.hasPlayServices();

//       // Sign in
//       const response = await GoogleSignin.signIn();
      
//       // Get user data
//       const googleUser = response.data;
//       if (!googleUser) {
//         throw new Error('No user data received from Google');
//       }

//       const user: AuthUser = {
//         id: googleUser.user.id,
//         displayName: googleUser.user.name || googleUser.user.email?.split('@')[0] || 'Google User',
//         email: googleUser.user.email || undefined,
//         photoUrl: googleUser.user.photo || undefined,
//         provider: 'google',
//         isOffline: false,
//       };

//       await this.saveUser(user);
//       return user;
//     } catch (error: any) {
//       console.error('Google sign-in failed:', error);
//       if (error.code === 'SIGN_IN_CANCELLED') {
//         throw new Error('Sign in was cancelled');
//       }
//       throw error;
//     }
//   }

//   /**
//    * Sign in with Facebook
//    * 
//    * SETUP INSTRUCTIONS:
//    * 1. Go to https://developers.facebook.com/
//    * 2. Create a new app or select existing
//    * 3. Add Facebook Login product
//    * 4. Configure OAuth redirect URLs
//    * 5. Get your App ID and App Secret
//    * 6. Add to app.json:
//    *    "plugins": [
//    *      ["react-native-fbsdk-next", {
//    *        "appID": "YOUR_FACEBOOK_APP_ID",
//    *        "clientToken": "YOUR_CLIENT_TOKEN",
//    *        "displayName": "YOUR_APP_NAME"
//    *      }]
//    *    ]
//    * 7. For Android: Add key hashes in Facebook dashboard
//    *    Get hash: keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
//    * 8. For iOS: Add bundle identifier in Facebook dashboard
//    */
//   async signInWithFacebook(): Promise<AuthUser> {
//     try {
//       const { LoginManager, AccessToken, Profile } = await import('react-native-fbsdk-next');
      
//       // Request permissions and login
//       const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      
//       if (result.isCancelled) {
//         throw new Error('Facebook sign-in was cancelled');
//       }

//       // Get access token
//       const token = await AccessToken.getCurrentAccessToken();
      
//       if (!token) {
//         throw new Error('Failed to get Facebook access token');
//       }

//       // Fetch user profile
//       const profile = await Profile.getCurrentProfile();

//       // Fetch email from Graph API
//       const response = await fetch(
//         `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token.accessToken}`
//       );
//       const userData = await response.json();

//       const user: AuthUser = {
//         id: userData.id,
//         displayName: userData.name || profile?.name || 'Facebook User',
//         email: userData.email || undefined,
//         photoUrl: userData.picture?.data?.url || profile?.imageURL || undefined,
//         provider: 'facebook',
//         isOffline: false,
//       };

//       await this.saveUser(user);
//       return user;
//     } catch (error: any) {
//       console.error('Facebook sign-in failed:', error);
//       throw error;
//     }
//   }

  /**
   * Sign in with Apple (iOS only)
   */
  async signInWithApple(): Promise<AuthUser> {
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS');
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Check if we already have this user saved
      const existingUser = this.currentUser;
      let displayName = 'Apple User';
      
      if (existingUser && existingUser.id === credential.user) {
        // Use existing display name
        displayName = existingUser.displayName;
      } else if (credential.fullName?.givenName) {
        // Use name from Apple (only provided on first sign-in)
        displayName = `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim();
      }
      // Note: On subsequent sign-ins, Apple doesn't provide the name again
      // The player profile will use the stored displayName
      
      const user: AuthUser = {
        id: credential.user,
        displayName,
        email: credential.email || undefined,
        provider: 'apple',
        isOffline: false,
      };

      await this.saveUser(user);
      return user;
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        throw new Error('Apple Sign-In was cancelled');
      }
      console.error('Apple sign-in failed:', error);
      throw error;
    }
  }

//   /**
//    * Sign in with Game Center (iOS only)
//    */
//   async signInWithGameCenter(): Promise<AuthUser> {
//     try {
//       if (Platform.OS !== 'ios') {
//         throw new Error('Game Center is only available on iOS');
//       }

//       // Game Center requires native module integration
//       // You would typically use expo-game-center or a custom native module
//       // This is a placeholder for the implementation
      
//       throw new Error('Game Center integration requires additional native setup');
//     } catch (error) {
//       console.error('Game Center sign-in failed:', error);
//       throw error;
//     }
//   }

//   /**
//    * Sign in with Google Play Games (Android only)
//    * 
//    * SETUP INSTRUCTIONS:
//    * 1. Install: expo install expo-auth-session expo-web-browser
//    * 2. Go to Google Play Console: https://play.google.com/console
//    * 3. Create or select your app
//    * 4. Go to "Play Games Services" → "Setup and management" → "Configuration"
//    * 5. Create credentials and link your app
//    * 6. Add OAuth 2.0 Client IDs (same as Google Sign-In)
//    * 7. For testing, add test accounts in Play Console
//    * 
//    * NOTE: For full Play Games features (achievements, leaderboards), you need:
//    * - expo install @react-native-google-signin/google-signin (already installed)
//    * - Additional native configuration in app.json
//    */
//   async signInWithGooglePlay(): Promise<AuthUser> {
//     try {
//       if (Platform.OS !== 'android') {
//         throw new Error('Google Play Games is only available on Android');
//       }

//       // Use Google Sign-In for Play Games authentication
//       // Play Games Services uses the same underlying Google account
//       const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      
//       // Configure with Play Games scopes
//       GoogleSignin.configure({
//         webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
//         offlineAccess: false,
//         scopes: ['https://www.googleapis.com/auth/games'], // Play Games scope
//       });

//       await GoogleSignin.hasPlayServices();
//       const response = await GoogleSignin.signIn();
//       const googleUser = response.data;
      
//       if (!googleUser) {
//         throw new Error('No user data received from Google Play Games');
//       }

//       const user: AuthUser = {
//         id: googleUser.user.id,
//         displayName: googleUser.user.name || googleUser.user.email?.split('@')[0] || 'Player',
//         email: googleUser.user.email || undefined,
//         photoUrl: googleUser.user.photo || undefined,
//         provider: 'google-play',
//         isOffline: false,
//       };

//       await this.saveUser(user);
//       return user;
//     } catch (error: any) {
//       console.error('Google Play Games sign-in failed:', error);
//       throw error;
//     }
//   }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      console.log('[AuthService] Starting email sign-in for:', email);
      
      // Trim inputs
      email = email.trim();
      password = password.trim();

      // Validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (password.length > 100) {
        throw new Error('Password is too long');
      }

      // Hash the password
      const passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );
      console.log('[AuthService] Password hashed');

      // Validate with server (authoritative source)
      const serverUrl = await getServerUrl();
      console.log('[AuthService] Validating with server:', serverUrl);
      
      const response = await fetch(`${serverUrl}/api/email/sign-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase(), passwordHash }),
      });

      console.log('[AuthService] Server response status:', response.status);
      const data = await response.json();

      if (!response.ok) {
        console.log('[AuthService] Sign-in failed:', data.error);
        throw new Error(data.error || 'Sign-in failed');
      }

      console.log('[AuthService] Server validation successful');

      // Update local storage with server data
      const EMAIL_ACCOUNTS_KEY = '@email_accounts';
      const accountsData = await AsyncStorage.getItem(EMAIL_ACCOUNTS_KEY);
      const accounts = accountsData ? JSON.parse(accountsData) : {};
      const emailKey = email.toLowerCase();
      
      accounts[emailKey] = {
        email: emailKey,
        passwordHash,
        userId: data.user.id,
        createdAt: data.user.createdAt || new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(EMAIL_ACCOUNTS_KEY, JSON.stringify(accounts));
      console.log('[AuthService] Local storage updated');

      // Create user object from server data
      const user: AuthUser = {
        id: data.user.id,
        displayName: data.user.username || email.split('@')[0],
        email: email,
        provider: 'email',
        isOffline: false,
      };

      await this.saveUser(user);
      return user;
    } catch (error) {
      console.error('Email sign-in failed:', error);
      throw error;
    }
  }

  /**
   * Create account with email and password
   */
  async createAccountWithEmail(email: string, password: string, displayName: string): Promise<AuthUser> {
    try {
      // Trim inputs
      email = email.trim();
      password = password.trim();
      displayName = displayName.trim();

      // Validation
      if (!email || !password || !displayName) {
        throw new Error('All fields are required');
      }

      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email format. Please use a valid email address.');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (password.length > 100) {
        throw new Error('Password is too long');
      }

      // Check for common weak passwords
      const weakPasswords = ['123456', 'password', 'qwerty', '111111', 'abc123', 'password123'];
      if (weakPasswords.includes(password.toLowerCase())) {
        throw new Error('Please choose a stronger password');
      }

      if (!this.isValidDisplayName(displayName)) {
        throw new Error('Display name must be 2-20 characters, contain at least one letter, and use only letters, numbers, spaces, dots, underscores, or hyphens');
      }

      // Check if email already exists
      const EMAIL_ACCOUNTS_KEY = '@email_accounts';
      const accountsData = await AsyncStorage.getItem(EMAIL_ACCOUNTS_KEY);
      const accounts = accountsData ? JSON.parse(accountsData) : {};
      const emailKey = email.toLowerCase();

      if (accounts[emailKey]) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }

      // Hash the password
      const passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      // Create unique user ID
      const userId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store account with hashed password
      accounts[emailKey] = {
        userId,
        displayName,
        email,
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(EMAIL_ACCOUNTS_KEY, JSON.stringify(accounts));

      const user: AuthUser = {
        id: userId,
        displayName: displayName,
        email: email,
        provider: 'email',
        isOffline: false,
      };

      await this.saveUser(user);
      
      // Send verification email (don't block account creation if it fails)
      try {
        await this.sendVerificationEmail(email, userId);
        console.log('[Auth] Verification email sent to:', email);
      } catch (error) {
        console.error('[Auth] Failed to send verification email:', error);
        // Continue anyway - user can resend later
      }
      
      return user;
    } catch (error) {
      console.error('Account creation failed:', error);
      throw error;
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    this.currentUser = null;
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }

  /**
   * Permanently delete the currently signed-in account and clear session
   * - For 'email' accounts: removes the email entry from local accounts storage
   * - For 'offline' accounts: clears the generated guest id
   * - For other providers: clears local session only (no remote provider integration here)
   */
  async deleteCurrentAccount(): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user is signed in');
    }

    const user = this.currentUser;

    try {
      if (user.provider === 'email' && user.email) {
        const EMAIL_ACCOUNTS_KEY = '@email_accounts';
        const accountsData = await AsyncStorage.getItem(EMAIL_ACCOUNTS_KEY);
        if (accountsData) {
          const accounts = JSON.parse(accountsData);
          const emailKey = user.email.toLowerCase();
          if (accounts[emailKey]) {
            delete accounts[emailKey];
            await AsyncStorage.setItem(EMAIL_ACCOUNTS_KEY, JSON.stringify(accounts));
          }
        }
      }

      if (user.provider === 'offline') {
        const GUEST_ID_KEY = '@guest_id';
        await AsyncStorage.removeItem(GUEST_ID_KEY);
      }

      // Clear current session
      this.currentUser = null;
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error('[Auth] Failed to delete account:', error);
      throw new Error('Failed to delete account');
    }
  }

  /**
   * Clear all email accounts (for testing/reset purposes)
   */
  async clearAllEmailAccounts(): Promise<void> {
    const EMAIL_ACCOUNTS_KEY = '@email_accounts';
    await AsyncStorage.removeItem(EMAIL_ACCOUNTS_KEY);
    console.log('[Auth] All email accounts cleared');
  }

  /**
   * Get all email accounts (for admin/debug purposes)
   */
  async getAllEmailAccounts(): Promise<Array<{ email: string; displayName: string; createdAt: string }>> {
    try {
      const EMAIL_ACCOUNTS_KEY = '@email_accounts';
      const accountsData = await AsyncStorage.getItem(EMAIL_ACCOUNTS_KEY);
      
      if (!accountsData) {
        return [];
      }

      const accounts = JSON.parse(accountsData);
      return Object.keys(accounts).map(email => ({
        email,
        displayName: accounts[email].displayName,
        createdAt: accounts[email].createdAt,
      }));
    } catch (error) {
      console.error('[Auth] Error getting email accounts:', error);
      return [];
    }
  }

  /**
   * Update user display name
   */
  async updateDisplayName(displayName: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user is signed in');
    }

    if (displayName.length < 2) {
      throw new Error('Display name must be at least 2 characters');
    }

    this.currentUser.displayName = displayName;
    await this.saveUser(this.currentUser);
  }

  /**
   * Check if Apple Sign-In is available
   */
  async isAppleSignInAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    try {
      return await AppleAuthentication.isAvailableAsync();
    } catch {
      return false;
    }
  }

  // Private helper methods

  private async saveUser(user: AuthUser): Promise<void> {
    this.currentUser = user;
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }

  private async getOrCreateGuestId(): Promise<string> {
    const GUEST_ID_KEY = '@guest_id';
    let guestId = await AsyncStorage.getItem(GUEST_ID_KEY);
    
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(GUEST_ID_KEY, guestId);
    }
    
    return guestId;
  }

  private isValidEmail(email: string): boolean {
    // More robust email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    // Must have a valid TLD (at least 2 characters)
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    
    const domain = parts[1].toLowerCase();
    const domainParts = domain.split('.');
    
    if (domainParts.length < 2) return false;
    if (domainParts[domainParts.length - 1].length < 2) return false;

    // Check for obviously invalid domains
    const invalidDomains = ['test.com', 'example.com', 'fake.com', 'asdf.com', 'temp.com', 'throw.away'];
    if (invalidDomains.includes(domain)) {
      return false;
    }

    return true;
  }

  private isValidDisplayName(name: string): boolean {
    // Check length
    if (name.length < 2 || name.length > 20) {
      return false;
    }

    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(name)) {
      return false;
    }

    // Only allow letters, numbers, spaces, and basic punctuation
    if (!/^[a-zA-Z0-9\s._-]+$/.test(name)) {
      return false;
    }

    // No excessive whitespace
    if (/\s{2,}/.test(name) || name.startsWith(' ') || name.endsWith(' ')) {
      return false;
    }

    // Basic profanity filter (add more as needed)
    const profanityList = ['fuck', 'shit', 'ass', 'damn', 'bitch', 'bastard', 'crap'];
    const lowerName = name.toLowerCase();
    for (const word of profanityList) {
      if (lowerName.includes(word)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, userId: string): Promise<{ success: boolean; message: string; skipVerification?: boolean }> {
    try {
      const { getServerUrl } = await import('../config/ServerConfig');
      const serverUrl = getServerUrl();
      
      const response = await fetch(`${serverUrl}/api/email/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('[Auth] Failed to send verification email:', error);
      return { 
        success: false, 
        message: 'Failed to send verification email. You can still use the app.',
        skipVerification: true 
      };
    }
  }

  /**
   * Check if email is verified
   */
  async checkEmailVerified(email: string): Promise<boolean> {
    try {
      const { getServerUrl } = await import('../config/ServerConfig');
      const serverUrl = await getServerUrl();
      
      const response = await fetch(`${serverUrl}/api/email/status/${encodeURIComponent(email)}`);
      const data = await response.json();
      return data.verified || false;
    } catch (error) {
      console.error('[Auth] Failed to check email status:', error);
      return false; // Assume not verified on error
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const { getServerUrl } = await import('../config/ServerConfig');
      const serverUrl = await getServerUrl();
      
      const response = await fetch(`${serverUrl}/api/email/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('[Auth] Failed to resend verification email:', error);
      return { success: false, message: 'Failed to resend verification email' };
    }
  }

  /**
   * Get email verification status for current user
   */
  async getCurrentUserEmailStatus(): Promise<{ verified: boolean; email?: string }> {
    const user = await this.getCurrentUser();
    
    if (!user || !user.email || user.provider !== 'email') {
      return { verified: true }; // Non-email users don't need verification
    }

    const verified = await this.checkEmailVerified(user.email);
    return { verified, email: user.email };
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('[AuthService] Starting password reset request for:', email);
      const { getServerUrl } = await import('../config/ServerConfig');
      const serverUrl = await getServerUrl();
      console.log('[AuthService] Using server URL:', serverUrl);
      
      console.log('[AuthService] Sending request to:', `${serverUrl}/api/email/request-reset`);
      const response = await fetch(`${serverUrl}/api/email/request-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      
      console.log('[AuthService] Response status:', response.status);

      if (!response.ok) {
        console.log('[AuthService] Request failed with status:', response.status);
        // Handle 503 (server waking up from sleep)
        if (response.status === 503) {
          console.log('[AuthService] Server is waking up (503)');
          return { 
            success: false, 
            message: 'Server is waking up. Please try again in a few seconds.' 
          };
        }
        
        const contentType = response.headers.get('content-type');
        console.log('[AuthService] Content-Type:', contentType);
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('[AuthService] Error response data:', data);
          return { success: false, message: data.error || 'Server error' };
        }
        console.log('[AuthService] Non-JSON error response');
        return { success: false, message: `Server error: ${response.status}` };
      }

      const data = await response.json();
      console.log('[AuthService] Success response data:', data);
      return data;
    } catch (error) {
      console.error('[AuthService] Request password reset error:', error);
      console.error('[AuthService] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return { 
        success: false, 
        message: 'Could not connect to server. Please check your internet connection.' 
      };
    }
  }

  /**
   * Verify password reset token
   */
  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    try {
      const { getServerUrl } = await import('../config/ServerConfig');
      const serverUrl = await getServerUrl();
      const response = await fetch(`${serverUrl}/api/email/verify-reset-token?token=${token}`);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          return { valid: false, error: data.error };
        }
        return { valid: false, error: `Server error: ${response.status}` };
      }
      
      const data = await response.json();
      return { valid: data.valid, email: data.email };
    } catch (error) {
      console.error('[AuthService] Verify reset token error:', error);
      return { valid: false, error: 'Could not connect to server' };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const { getServerUrl } = await import('../config/ServerConfig');
      const serverUrl = await getServerUrl();
      const response = await fetch(`${serverUrl}/api/email/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          return { success: false, error: data.error };
        }
        return { success: false, error: `Server error: ${response.status}` };
      }
      
      const data = await response.json();
      return { success: true, message: data.message };
    } catch (error) {
      console.error('[AuthService] Reset password error:', error);
      return { 
        success: false, 
        error: 'Could not connect to server. Please check your internet connection.' 
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
