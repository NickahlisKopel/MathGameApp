import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface IslandButtonProps {
  onPress: () => void;
  icon: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
  testID?: string;
}

/**
 * IslandButton - A floating button component with island design principles
 * Features rounded corners, elevation, and smooth shadows
 */
export const IslandButton: React.FC<IslandButtonProps> = ({
  onPress,
  icon,
  size = 'medium',
  variant = 'primary',
  style,
  testID,
}) => {
  const sizeStyles = {
    small: { width: 44, height: 44, borderRadius: 22 },
    medium: { width: 56, height: 56, borderRadius: 28 },
    large: { width: 68, height: 68, borderRadius: 34 },
  };

  const variantStyles = {
    primary: { backgroundColor: 'rgba(255, 255, 255, 0.95)' },
    secondary: { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
    danger: { backgroundColor: 'rgba(255, 71, 87, 0.9)' },
  };

  const iconSize = {
    small: 20,
    medium: 24,
    large: 28,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.islandButton,
        sizeStyles[size],
        variantStyles[variant],
        style,
      ]}
      activeOpacity={0.8}
      testID={testID}
    >
      <Text style={[styles.iconText, { fontSize: iconSize[size] }]}>{icon}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  islandButton: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  iconText: {
    textAlign: 'center',
  },
});
