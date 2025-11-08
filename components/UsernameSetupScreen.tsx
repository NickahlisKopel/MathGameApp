import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBackground } from '../hooks/useBackground';
import { useTheme, getContrastColor } from '../contexts/ThemeContext';

interface Props {
  onUsernameCreated: (username: string) => void;
}

const { width, height } = Dimensions.get('window');

export default function UsernameSetupScreen({ onUsernameCreated }: Props) {
  const { backgroundColors, backgroundType } = useBackground();
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(height * 0.3));

  React.useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateUsername = (username: string): string | null => {
    const trimmed = username.trim();
    
    if (trimmed.length < 2) {
      return 'Username must be at least 2 characters long';
    }
    
    if (trimmed.length > 15) {
      return 'Username must be no more than 15 characters long';
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    
    // Check for inappropriate words (basic filter)
    const inappropriateWords = ['admin', 'test', 'null', 'undefined', 'guest'];
    if (inappropriateWords.some(word => trimmed.toLowerCase().includes(word))) {
      return 'Please choose a different username';
    }
    
    return null;
  };

  const handleCreateUsername = async () => {
    const validationError = validateUsername(username);
    if (validationError) {
      Alert.alert('Invalid Username', validationError);
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onUsernameCreated(username.trim());
    } catch (error) {
      Alert.alert('Error', 'Failed to create username. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestion = () => {
    const adjectives = ['Smart', 'Quick', 'Clever', 'Bright', 'Swift', 'Sharp', 'Wise', 'Fast'];
    const nouns = ['Math', 'Brain', 'Mind', 'Genius', 'Star', 'Hero', 'Pro', 'Master'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 999) + 1;
    
    return `${randomAdj}${randomNoun}${randomNum}`;
  };

  return (
    <LinearGradient colors={backgroundColors as any} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
          <Animated.View 
            style={[
              styles.animatedContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.headerContainer}>
              <Text style={styles.welcomeEmoji}>🎯</Text>
              <Text style={[styles.title, { color: getContrastColor(backgroundType, theme) }]}>Welcome to Math Battle!</Text>
              <Text style={[styles.subtitle, { color: getContrastColor(backgroundType, theme) }]}>
                Create your player profile to start your mathematical journey
              </Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={[styles.inputLabel, { color: getContrastColor(backgroundType, theme) }]}>Choose Your Username</Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.textInput,
                    username.length > 0 && validateUsername(username) ? styles.inputError : {},
                  ]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter your username..."
                  placeholderTextColor={theme.colors.placeholderText}
                  maxLength={15}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleCreateUsername}
                  editable={!isLoading}
                />
                <Text style={[styles.characterCount, { color: getContrastColor(backgroundType, theme) }]}>
                  {username.length}/15
                </Text>
              </View>

              {username.length > 0 && validateUsername(username) && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {validateUsername(username)}
                </Text>
              )}

              <TouchableOpacity
                style={styles.suggestionButton}
                onPress={() => setUsername(getSuggestion())}
                disabled={isLoading}
              >
                <Text style={[styles.suggestionText, { color: getContrastColor(backgroundType, theme) }]}>
                  💡 Get a random suggestion
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  (!username.trim() || validateUsername(username) || isLoading) && styles.createButtonDisabled,
                ]}
                onPress={handleCreateUsername}
                disabled={!username.trim() || !!validateUsername(username) || isLoading}
              >
                <Text style={[
                  styles.createButtonText,
                  (!username.trim() || validateUsername(username) || isLoading) && styles.createButtonTextDisabled,
                ]}>
                  {isLoading ? 'Creating Profile...' : 'Create Profile'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Tips for a great username:</Text>
              <Text style={styles.tipText}>• 2-15 characters long</Text>
              <Text style={styles.tipText}>• Use letters, numbers, - or _</Text>
              <Text style={styles.tipText}>• Make it unique and memorable!</Text>
            </View>
          </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  animatedContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#ff6b6b',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  characterCount: {
    position: 'absolute',
    right: 15,
    top: 17,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    fontWeight: '500',
  },
  suggestionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  suggestionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    paddingVertical: 18,
    paddingHorizontal: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  createButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    elevation: 0,
    shadowOpacity: 0,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  createButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  tipText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
    textAlign: 'center',
  },
});
