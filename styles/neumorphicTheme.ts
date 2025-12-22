/**
 * Neumorphic Design System
 * Soft shadows, subtle depth, tactile feeling
 */

import { Platform } from 'react-native';

type ThemeMode = 'light' | 'dark';

// Light theme colors
const lightColors = {
  background: {
    light: '#E0E5EC',
    main: '#DDE1E7',
    dark: '#C8CDD3',
  },
  text: {
    primary: '#44484D',
    secondary: '#6B7280',
    disabled: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  shadowLight: '#FFFFFF',
  shadowDark: '#A3B1C6',
};

// Dark theme colors
const darkColors = {
  background: {
    light: '#2C2E33',
    main: '#23252A',
    dark: '#1A1C20',
  },
  text: {
    primary: '#E5E7EB',
    secondary: '#9CA3AF',
    disabled: '#6B7280',
    inverse: '#1F2937',
  },
  shadowLight: '#383A40',
  shadowDark: '#0F1012',
};

// Shared colors (same for both themes)
const sharedColors = {
  primary: {
    light: '#A8B4C8',
    main: '#7C8DB5',
    dark: '#5B6E95',
  },
  secondary: {
    light: '#B8A8C8',
    main: '#967CB5',
    dark: '#745B95',
  },
  success: {
    light: '#A8C8B4',
    main: '#7CB58D',
    dark: '#5B9570',
  },
  error: {
    light: '#C8A8A8',
    main: '#B57C7C',
    dark: '#955B5B',
  },
  modes: {
    classic: '#7C8DB5',
    timesTable: '#967CB5',
    bubblePop: '#7CB58D',
    multiplayer: '#B58D7C',
  },
};

export const getThemeColors = (mode: ThemeMode = 'light') => {
  const themeColors = mode === 'dark' ? darkColors : lightColors;

  return {
    ...sharedColors,
    background: themeColors.background,
    text: themeColors.text,
    shadowLight: themeColors.shadowLight,
    shadowDark: themeColors.shadowDark,
  };
};

// Default export for backwards compatibility
export const neumorphicColors = getThemeColors('light');

// React hook to access mode-aware neumorphic tokens inside components
import { useTheme } from '../contexts/ThemeContext';

export const useNeumorphicColors = () => {
  const { isDarkMode } = useTheme();
  return getThemeColors(isDarkMode ? 'dark' : 'light');
};

export const getNeumorphicShadows = (colors: any) => ({
  // Soft raised effect
  raised: {
    shadowColor: colors.shadowLight,
    shadowOffset: { width: -6, height: -6 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },

  raisedDark: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  // Pressed/inset effect
  inset: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: -2,
  },

  insetLight: {
    shadowColor: colors.shadowLight,
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: -2,
  },

  // Floating effect
  floating: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
});

// Helper function to create neumorphic button style
export const createNeumorphicButton = (
  colors: any,
  pressed: boolean = false,
  color?: string,
) => {
  const shadows = getNeumorphicShadows(colors);
  const baseColor = color || colors.background.main;

  if (pressed) {
    return {
      backgroundColor: baseColor,
      ...shadows.inset,
      borderRadius: 20,
    };
  }

  return {
    backgroundColor: baseColor,
    ...shadows.raised,
    borderRadius: 20,
  };
};

// Helper function to create neumorphic card style
export const createNeumorphicCard = (colors: any, color?: string) => {
  const shadows = getNeumorphicShadows(colors);
  return {
    backgroundColor: color || colors.background.main,
    ...shadows.raised,
    borderRadius: 24,
    padding: 20,
  };
};

// Helper function for Android shadow workaround
export const getNeumorphicStyle = (
  colors: any,
  type: 'raised' | 'inset' | 'floating' = 'raised',
) => {
  const shadows = getNeumorphicShadows(colors);
  const baseStyle = {
    backgroundColor: colors.background.main,
    borderRadius: 20,
  };

  if (Platform.OS === 'android') {
    // Android uses elevation, simulate neumorphism with borders
    return {
      ...baseStyle,
      elevation: type === 'inset' ? 0 : type === 'floating' ? 12 : 8,
      borderWidth: type === 'inset' ? 2 : 0,
      borderColor: type === 'inset' ? colors.background.dark : 'transparent',
    };
  }

  // iOS uses shadows
  return {
    ...baseStyle,
    ...shadows[type],
  };
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  round: 999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },
};
