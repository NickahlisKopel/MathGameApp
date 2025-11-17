import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { authService, AuthProvider } from '../services/AuthService';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';

interface AuthenticationScreenProps {
  onAuthComplete: () => void;
  allowOfflineMode?: boolean;
}

type AuthMode = 'select' | 'email-signin' | 'email-signup';

export default function AuthenticationScreen({ 
  onAuthComplete, 
  allowOfflineMode = true 
}: AuthenticationScreenProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    checkAppleSignIn();
  }, []);

  const checkAppleSignIn = async () => {
    const available = await authService.isAppleSignInAvailable();
    setAppleSignInAvailable(available);
  };

  const handleAuth = async (provider: AuthProvider, authFn: () => Promise<any>) => {
    setLoading(true);
    try {
      await authFn();
      onAuthComplete();
    } catch (error: any) {
      Alert.alert('Authentication Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineMode = async () => {
    if (allowOfflineMode) {
      await handleAuth('offline', () => authService.signInOffline());
    }
  };

  const handleAppleSignIn = async () => {
    await handleAuth('apple', () => authService.signInWithApple());
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    await handleAuth('email', () => authService.signInWithEmail(email, password));
  };

  const handleEmailSignUp = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    try {
      setLoading(true);
      const user = await authService.createAccountWithEmail(email, password, displayName);
      
      // Show verification message
      Alert.alert(
        '✅ Account Created!',
        `Welcome ${displayName}!\n\nWe've sent a verification email to ${email}. Please check your inbox and verify your email address.`,
        [{ text: 'OK', onPress: onAuthComplete }]
      );
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Password reset feature is coming soon!\n\nFor now, you can:\n• Create a new account\n• Contact support if you need help',
      [{ text: 'OK' }]
    );
  };

  const renderSelectionScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Math Game</Text>
        <Text style={styles.subtitle}>Sign in to play online and save your progress</Text>
      </View>

      <ScrollView style={styles.buttonContainer} contentContainerStyle={styles.buttonContent}>
        {/* Apple Sign In (iOS only) */}
        {appleSignInAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}

        {/* Google Play Games (Android only) */}
        {Platform.OS === 'android' && (
          <TouchableOpacity
            style={[styles.authButton, styles.googlePlayButton]}
            onPress={() => Alert.alert('Coming Soon', 'Google Play Games integration is in development')}
          >
            <Text style={styles.buttonIcon}>🎮</Text>
            <Text style={styles.buttonText}>Continue with Google Play Games</Text>
          </TouchableOpacity>
        )}

        {/* Game Center (iOS only) */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.authButton, styles.gameCenterButton]}
            onPress={() => Alert.alert('Coming Soon', 'Game Center integration is in development')}
          >
            <Text style={styles.buttonIcon}>🎮</Text>
            <Text style={styles.buttonText}>Continue with Game Center</Text>
          </TouchableOpacity>
        )}

        {/* Google Sign In */}
        <TouchableOpacity
          style={[styles.authButton, styles.googleButton]}
          onPress={() => Alert.alert('Setup Required', 'Google Sign-In requires OAuth configuration in your Google Cloud Console')}
        >
          <Text style={styles.buttonIcon}>📧</Text>
          <Text style={styles.buttonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Facebook Sign In */}
        <TouchableOpacity
          style={[styles.authButton, styles.facebookButton]}
          onPress={() => Alert.alert('Setup Required', 'Facebook Sign-In requires Facebook App ID configuration')}
        >
          <Text style={styles.buttonIcon}>👤</Text>
          <Text style={styles.buttonText}>Continue with Facebook</Text>
        </TouchableOpacity>

        {/* Email/Password */}
        <TouchableOpacity
          style={[styles.authButton, styles.emailButton]}
          onPress={() => setAuthMode('email-signin')}
        >
          <Text style={styles.buttonIcon}>✉️</Text>
          <Text style={styles.buttonText}>Continue with Email</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Offline Mode */}
        {allowOfflineMode && (
          <TouchableOpacity
            style={[styles.authButton, styles.offlineButton]}
            onPress={handleOfflineMode}
          >
            <Text style={styles.buttonIcon}>📱</Text>
            <Text style={styles.buttonText}>Play Offline (Guest Mode)</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.offlineNote}>
          Note: Offline mode does not allow online multiplayer or cloud save features
        </Text>
      </ScrollView>
    </View>
  );

  const renderEmailSignIn = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setAuthMode('select')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>Enter your email and password</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={24}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.authButton, styles.primaryButton]}
          onPress={handleEmailSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleForgotPassword}
          style={styles.forgotPasswordButton}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setAuthMode('email-signup')}
          style={styles.switchModeButton}
        >
          <Text style={styles.switchModeText}>
            Don't have an account? <Text style={styles.switchModeLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderEmailSignUp = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setAuthMode('select')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Enter your information</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Display Name"
          placeholderTextColor="#999"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password (min 6 characters)"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={24}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.authButton, styles.primaryButton]}
          onPress={handleEmailSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setAuthMode('email-signin')}
          style={styles.switchModeButton}
        >
          <Text style={styles.switchModeText}>
            Already have an account? <Text style={styles.switchModeLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  if (authMode === 'email-signin') return renderEmailSignIn();
  if (authMode === 'email-signup') return renderEmailSignUp();
  return renderSelectionScreen();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
  },
  buttonContainer: {
    flex: 1,
    paddingHorizontal: 30,
  },
  buttonContent: {
    paddingBottom: 40,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  appleButton: {
    width: '100%',
    height: 55,
    marginBottom: 15,
  },
  googlePlayButton: {
    backgroundColor: '#01875f',
  },
  gameCenterButton: {
    backgroundColor: '#5f6caf',
  },
  googleButton: {
    backgroundColor: '#4285f4',
  },
  facebookButton: {
    backgroundColor: '#1877f2',
  },
  emailButton: {
    backgroundColor: '#666',
  },
  offlineButton: {
    backgroundColor: '#444',
    borderWidth: 1,
    borderColor: '#666',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    marginTop: 10,
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#444',
  },
  dividerText: {
    color: '#aaa',
    marginHorizontal: 15,
    fontSize: 14,
  },
  offlineNote: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
  formContainer: {
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 55,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 16,
    padding: 5,
  },
  forgotPasswordButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  switchModeButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#aaa',
    fontSize: 14,
  },
  switchModeLink: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});
