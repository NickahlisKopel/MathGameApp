import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { useNeumorphicColors, getNeumorphicStyle, typography, spacing } from '../../styles/neumorphicTheme';

interface NeumorphicButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'error';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const NeumorphicButton: React.FC<NeumorphicButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  disabled = false,
  fullWidth = false,
  style,
}) => {
  const [pressed, setPressed] = useState(false);
  const neumorphicColors = useNeumorphicColors();

  const styles = StyleSheet.create({
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    text: {
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    icon: {
      marginRight: spacing.sm,
    },
    fullWidth: {
      width: '100%',
    },
    disabled: {
      opacity: 0.5,
    },
    innerGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
    },
  });

  const getVariantColor = () => {
    switch (variant) {
      case 'primary':
          return neumorphicColors.primary.main;
      case 'secondary':
          return neumorphicColors.secondary.main;
      case 'success':
          return neumorphicColors.success.main;
      case 'error':
          return neumorphicColors.error.main;
      default:
        return neumorphicColors.primary.main;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          minHeight: 40,
        };
      case 'large':
        return {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          minHeight: 64,
        };
      default:
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          minHeight: 52,
        };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={[
        styles.button,
        getNeumorphicStyle(neumorphicColors, pressed ? 'inset' : 'raised'),
        getSizeStyles(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={1}
    >
      <View style={styles.content}>
        {icon && <Text style={[styles.icon, { fontSize: getFontSize() + 2 }]}>{icon}</Text>}
        <Text
          style={[
            styles.text,
            {
              fontSize: getFontSize(),
              color: disabled ? neumorphicColors.text.disabled : neumorphicColors.text.primary,
            },
          ]}
        >
          {title}
        </Text>
      </View>

      {/* Inner gradient for depth */}
      {!disabled && (
        <View
          style={[
            styles.innerGradient,
            {
              backgroundColor: pressed ?
                'rgba(163, 177, 198, 0.1)' :
                'rgba(255, 255, 255, 0.05)',
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
};
 
