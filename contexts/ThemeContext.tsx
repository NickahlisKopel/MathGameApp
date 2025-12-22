import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PlayerStorageService } from '../services/PlayerStorageService';
import { ShopService } from '../services/ShopService';

export interface ThemeColors {
  // Background colors
  primary: string;
  secondary: string;
  surface: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Interactive elements
  accent: string;
  success: string;
  error: string;
  warning: string;
  
  // Borders and dividers
  border: string;
  divider: string;
  
  // Special colors that adapt based on background
  overlay: string;
  shadow: string;
  
  // Input specific colors
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  placeholderText: string;
}

export interface Theme {
  isDark: boolean;
  colors: ThemeColors;
}

// Light theme colors
const lightTheme: ThemeColors = {
  primary: '#ffffff',
  secondary: '#f8f9fa',
  surface: '#ffffff',
  card: 'rgba(255, 255, 255, 0.95)',
  
  text: '#000000',
  textSecondary: '#333333',
  textTertiary: '#666666',
  
  accent: '#4CAF50',
  success: '#4CAF50',
  error: '#f44336',
  warning: '#ff9500',
  
  border: '#e0e0e0',
  divider: '#f0f0f0',
  
  overlay: 'rgba(255, 255, 255, 0.9)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  
  inputBackground: '#ffffff',
  inputBorder: '#333333',
  inputText: '#000000',
  placeholderText: '#666666',
};

// Dark theme colors
const darkTheme: ThemeColors = {
  primary: '#000000',
  secondary: '#000000',
  surface: '#000000',
  card: '#000000',
  
  text: '#ffffff',
  textSecondary: '#e0e0e0',
  textTertiary: '#ffffff',
  
  accent: '#4CAF50',
  success: '#4CAF50',
  error: '#ff6b6b',
  warning: '#ffa726',
  
  border: '#333333',
  divider: '#2a2a2a',
  
  overlay: 'rgba(0, 0, 0, 0.9)',
  shadow: 'rgba(255, 255, 255, 0.1)',
  
  inputBackground: '#000000',
  inputBorder: '#ffffff',
  inputText: '#ffffff',
  placeholderText: '#ffffff',
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDarkMode: boolean;
  reduceMotion: boolean;
  toggleReduceMotion: () => void;
  presets: Array<any>;
  saveThemePreset: (name: string) => Promise<void>;
  applyThemePreset: (id: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [presets, setPresets] = useState<Array<any>>([]);

  useEffect(() => {
    // Load theme and motion preferences from player settings
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      if (player) {
        if (player.settings.darkMode !== undefined) {
          setIsDarkMode(player.settings.darkMode);
        }
        if (player.settings.reduceMotion !== undefined) {
          setReduceMotion(player.settings.reduceMotion);
        }
        // Load presets for this player if available
        try {
          const themes = await PlayerStorageService.loadPlayerThemes(player.id);
          setPresets(themes || []);
        } catch (e) {
          console.warn('No saved theme presets');
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const toggleTheme = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    try {
      // Save theme preference to player settings
      await PlayerStorageService.updatePlayerSettings({ darkMode: newDarkMode });
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleReduceMotion = async () => {
    const newReduceMotion = !reduceMotion;
    setReduceMotion(newReduceMotion);
    
    try {
      // Save motion preference to player settings
      await PlayerStorageService.updatePlayerSettings({ reduceMotion: newReduceMotion });
    } catch (error) {
      console.error('Error saving motion preference:', error);
    }
  };

  // Save a theme preset: captures current background and neumorphic mode
  const saveThemePreset = async (name: string) => {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      if (!player) throw new Error('No player');

      // Capture current active background
      const activeBg = await ShopService.getActiveBackground();
      const preset = {
        id: `theme_${Date.now().toString(36)}`,
        name,
        createdAt: new Date().toISOString(),
        backgroundId: activeBg?.id || null,
        neumorphicMode: isDarkMode ? 'dark' : 'light',
      };

      const existing = await PlayerStorageService.loadPlayerThemes(player.id);
      const updated = [...existing, preset];
      await PlayerStorageService.savePlayerThemes(player.id, updated);
      setPresets(updated);

      // Optionally set it as the selected theme id in player customization
      await PlayerStorageService.updatePlayerCustomization({ theme: preset.id });
    } catch (error) {
      console.error('Failed to save theme preset:', error);
      throw error;
    }
  };

  const applyThemePreset = async (id: string) => {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      if (!player) throw new Error('No player');

      const themes = await PlayerStorageService.loadPlayerThemes(player.id);
      const preset = themes.find((t: any) => t.id === id);
      if (!preset) throw new Error('Preset not found');

      // Apply neumorphic mode
      const targetDark = preset.neumorphicMode === 'dark';
      setIsDarkMode(targetDark);
      await PlayerStorageService.updatePlayerSettings({ darkMode: targetDark });

      // Apply background if present
      if (preset.backgroundId) {
        await ShopService.setActiveBackground(preset.backgroundId);
      }

      // Save selected theme id to customization
      await PlayerStorageService.updatePlayerCustomization({ theme: preset.id });
    } catch (error) {
      console.error('Failed to apply theme preset:', error);
      throw error;
    }
  };

  const theme: Theme = {
    isDark: isDarkMode,
    colors: isDarkMode ? darkTheme : lightTheme,
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDarkMode, reduceMotion, toggleReduceMotion, presets, saveThemePreset, applyThemePreset }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Utility function to get themed colors for styled components
export const getThemedColors = (isDark: boolean): ThemeColors => {
  return isDark ? darkTheme : lightTheme;
};

// Helper function for components that need to determine text color based on background
export const getContrastColor = (backgroundColor: string, theme: Theme): string => {
  // For space background and other animated backgrounds, always use white text
  if (backgroundColor.includes('space') || backgroundColor.includes('animated')) {
    return '#ffffff';
  }
  
  // For gradient backgrounds, use white text
  if (backgroundColor.includes('gradient') || backgroundColor.includes('linear')) {
    return '#ffffff';
  }
  
  // For solid colors, use theme-based text
  return theme.colors.text;
};
