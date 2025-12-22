import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { NeumorphicInput } from './neumorphic/NeumorphicInput';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';
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

      <NeumorphicInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        label="Email"
      />

      <NeumorphicInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        label="Password"
      />

      <NeumorphicButton title="Sign In" onPress={handleSignIn} fullWidth />
      <View style={{ height: 12 }} />
      <NeumorphicButton title="Register" onPress={handleRegister} variant="secondary" fullWidth />
      <View style={{ height: 12 }} />
      <NeumorphicButton title="Play as Guest" onPress={async () => {
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
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  error: {
    color: 'red',
    marginTop: 12,
  },
});

export default SignInScreen;
