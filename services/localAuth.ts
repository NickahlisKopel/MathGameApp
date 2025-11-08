import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple user type for local auth
export interface LocalUser {
  uid: string;
  email?: string;
  displayName?: string;
  isAnonymous: boolean;
}

export class LocalAuthService {
  private static readonly USER_KEY = 'local_user';
  private currentUser: LocalUser | null = null;
  private authListeners: ((user: LocalUser | null) => void)[] = [];

  constructor() {
    this.loadStoredUser();
  }

  private async loadStoredUser() {
    try {
      const userData = await AsyncStorage.getItem(LocalAuthService.USER_KEY);
      if (userData) {
        this.currentUser = JSON.parse(userData);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    }
  }

  private async saveUser(user: LocalUser | null) {
    try {
      if (user) {
        await AsyncStorage.setItem(LocalAuthService.USER_KEY, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(LocalAuthService.USER_KEY);
      }
      this.currentUser = user;
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  private notifyListeners() {
    this.authListeners.forEach(listener => listener(this.currentUser));
  }

  // Create anonymous user (for local gameplay)
  async signInAnonymously(): Promise<LocalUser> {
    const user: LocalUser = {
      uid: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isAnonymous: true,
      displayName: 'Anonymous Player'
    };
    
    await this.saveUser(user);
    return user;
  }

  // Simple email/password sign in (local only)
  async signInWithEmail(email: string, password: string): Promise<LocalUser> {
    // In a real app, you'd validate credentials
    // For now, just create a local user
    const user: LocalUser = {
      uid: `email_${email.replace('@', '_').replace('.', '_')}`,
      email,
      displayName: email.split('@')[0],
      isAnonymous: false
    };
    
    await this.saveUser(user);
    return user;
  }

  // Create account with email/password (local only)
  async createUserWithEmail(email: string, password: string): Promise<LocalUser> {
    // Same as sign in for local auth
    return this.signInWithEmail(email, password);
  }

  // Sign out
  async signOut(): Promise<void> {
    await this.saveUser(null);
  }

  // Get current user
  getCurrentUser(): LocalUser | null {
    return this.currentUser;
  }

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: LocalUser | null) => void): () => void {
    this.authListeners.push(callback);
    
    // Call immediately with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      const index = this.authListeners.indexOf(callback);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  // Update user profile
  async updateProfile(updates: { displayName?: string }): Promise<void> {
    if (this.currentUser) {
      const updatedUser = { ...this.currentUser, ...updates };
      await this.saveUser(updatedUser);
    }
  }
}

// Singleton instance
export const localAuth = new LocalAuthService();