import React, { useState, useEffect, ReactNode } from 'react';
import { View, Text, Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { localAuth, LocalUser } from '../services/localAuth';

interface SignInScreenProps {
  onSignedIn: (user: LocalUser) => void;
}

const SignInScreen: React.FC<SignInScreenProps> = ({ onSignedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = localAuth.onAuthStateChanged((user: LocalUser | null) => {
      if (user) {
        onSignedIn(user);
      }
    });
    return unsubscribe;
  }, [onSignedIn]);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await localAuth.signInWithEmail(email, password);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      await localAuth.createUserWithEmail(email, password);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  

 

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>

      <AuthInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        label="Email"
      />

      <AuthInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        label="Password"
      />

      <AuthButton title="Sign In" onPress={handleSignIn} fullWidth />
      <View style={{ height: 12 }} />
      <AuthButton title="Register" onPress={handleRegister} variant="secondary" fullWidth />
      <View style={{ height: 12 }} />
      <AuthButton title="Play as Guest" onPress={async () => {
        setLoading(true);
        try {
          await localAuth.signInAnonymously();
        } catch (e: any) {
          setError(e.message);
        }
        setLoading(false);
      }} variant="secondary" fullWidth />

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

type AuthButtonProps = {
  title: string | ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
};

const AuthButton: React.FC<AuthButtonProps> = ({ title, onPress, variant = 'primary', fullWidth }) => {
  const isSecondary = variant === 'secondary';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, fullWidth && styles.fullWidth, isSecondary && styles.buttonSecondary]}
    >
      {typeof title === 'string' ? <Text style={[styles.buttonText, isSecondary && styles.buttonTextSecondary]}>{title}</Text> : title}
    </TouchableOpacity>
  );
};

type AuthInputProps = {
  label?: string | ReactNode;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: any;
};

const AuthInput: React.FC<AuthInputProps> = ({ label, value, onChangeText, placeholder, secureTextEntry, autoCapitalize, keyboardType }) => {
  return (
    <>
      {label !== undefined && (typeof label === 'string' ? <Text style={styles.inputLabelText}>{label}</Text> : label)}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  inputLabelText: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#2b8cff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#e6eefc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#2b8cff',
  },
  fullWidth: {
    width: '100%',
  },
  error: {
    color: 'red',
    marginTop: 12,
  },
});

export default SignInScreen;
