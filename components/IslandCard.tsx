import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface IslandCardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'floating' | 'subtle';
  style?: ViewStyle;
  padding?: number;
}

/**
 * IslandCard - A card component with island design principles
 * Features rounded corners, elevation, and backdrop effects
 */
export const IslandCard: React.FC<IslandCardProps> = ({
  children,
  variant = 'elevated',
  style,
  padding = 20,
}) => {
  const { theme, isDarkMode } = useTheme();
  
  const variantStyles = {
    elevated: {
      backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255,1)',
      elevation: 8,
      shadowColor: isDarkMode ? '#fff' : '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.1 : 0.2,
      shadowRadius: 12,
    },
    floating: {
      backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)',
      elevation: 12,
      shadowColor: isDarkMode ? '#fff' : '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDarkMode ? 0.15 : 0.25,
      shadowRadius: 16,
    },
    subtle: {
      backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)',
      elevation: 4,
      shadowColor: isDarkMode ? '#fff' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.08 : 0.15,
      shadowRadius: 8,
    },
  };

  return (
    <View
      style={[
        styles.islandCard,
        variantStyles[variant],
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  islandCard: {
    borderRadius: 24,
  },
});
