import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

interface NeumorphicThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const NeumorphicThemeContext = createContext<NeumorphicThemeContextType | undefined>(undefined);

export const NeumorphicThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('neumorphic_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setMode(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    try {
      await AsyncStorage.setItem('neumorphic_theme', newMode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <NeumorphicThemeContext.Provider value={{ mode, toggleTheme }}>
      {children}
    </NeumorphicThemeContext.Provider>
  );
};

export const useNeumorphicTheme = () => {
  const context = useContext(NeumorphicThemeContext);
  if (!context) {
    throw new Error('useNeumorphicTheme must be used within NeumorphicThemeProvider');
  }
  return context;
};
