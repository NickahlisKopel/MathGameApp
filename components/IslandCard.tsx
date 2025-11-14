import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

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
  const variantStyles = {
    elevated: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    floating: {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      elevation: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
    },
    subtle: {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
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
