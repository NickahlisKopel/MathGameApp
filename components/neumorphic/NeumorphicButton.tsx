import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, GestureResponderEvent, View } from 'react-native';
import { spacing } from '../../styles/neumorphicTheme';
import { useTheme, getContrastColor } from '../../contexts/ThemeContext';

interface NeumorphicButtonProps {
  title?: string;
  icon?: string;
  onPress?: (e?: GestureResponderEvent) => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'success' | 'error';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  shape?: 'rounded' | 'circle';
  style?: ViewStyle | any;
  testID?: string;
}

export const NeumorphicButton: React.FC<NeumorphicButtonProps> = ({
  title,
  icon,
  onPress,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  shape = 'rounded',
  style,
  testID,
}) => {
  const sizeStyle = useMemo(() => {
    switch (size) {
      case 'small':
        return { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 40 };
      case 'large':
        return { paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, minHeight: 64 };
      default:
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 52 };
    }
  }, [size]);

  const bgColor = variant === 'primary' ? '#3B82F6' : variant === 'secondary' ? '#E5E7EB' : variant === 'success' ? '#D1FAE5' : '#FEE2E2';
  const { theme } = useTheme();
  const resolvedBg = variant === 'primary' ? theme.colors.accent : variant === 'secondary' ? theme.colors.surface : variant === 'success' ? theme.colors.success : theme.colors.error;
  const textColor = getContrastColor(resolvedBg || '#000', theme);

  const circleDiameter = size === 'large' ? 80 : size === 'small' ? 44 : 64;

  const computedStyle: ViewStyle | any = [
    styles.button,
    sizeStyle,
    { backgroundColor: resolvedBg },
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    shape === 'circle' && { width: circleDiameter, height: circleDiameter, borderRadius: Math.round(circleDiameter / 2), paddingHorizontal: 0, paddingVertical: 0 },
    style,
  ];

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress as any}
      disabled={disabled}
      activeOpacity={0.8}
      style={computedStyle}
    >
      {shape === 'circle' ? (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: textColor, fontSize: 20 }}>{icon || title}</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {icon ? <Text style={[styles.icon, { color: textColor }]}>{icon}</Text> : null}
          {title ? <Text style={[styles.text, { color: textColor }]}>{title}</Text> : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  icon: {
    marginRight: spacing.sm,
    fontSize: 18,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
});

export default NeumorphicButton;





