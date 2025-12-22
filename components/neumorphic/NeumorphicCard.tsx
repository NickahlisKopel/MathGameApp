import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useNeumorphicColors, getNeumorphicStyle, spacing } from '../../styles/neumorphicTheme';

interface NeumorphicCardProps {
  children: React.ReactNode;
  variant?: 'raised' | 'inset' | 'floating';
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export const NeumorphicCard: React.FC<NeumorphicCardProps> = ({
  children,
  variant = 'raised',
  padding = spacing.lg,
  style,
}) => {
  const neumorphicColors = useNeumorphicColors();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: neumorphicColors.background.main,
    },
  });

  return (
    <View
      style={[
        styles.card,
        getNeumorphicStyle(neumorphicColors, variant),
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
};

