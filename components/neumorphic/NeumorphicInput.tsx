import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import { useNeumorphicColors, getNeumorphicStyle, spacing, typography } from '../../styles/neumorphicTheme';

interface NeumorphicInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: string;
  containerStyle?: ViewStyle;
}

export const NeumorphicInput: React.FC<NeumorphicInputProps> = ({
  label,
  error,
  icon,
  containerStyle,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const neumorphicColors = useNeumorphicColors();

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    label: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
      marginBottom: spacing.sm,
      marginLeft: spacing.sm,
      fontWeight: '600',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      minHeight: 52,
    },
    focused: {
      borderWidth: 2,
      borderColor: neumorphicColors.primary.light,
    },
    error: {
      borderWidth: 2,
      borderColor: neumorphicColors.error.main,
    },
    icon: {
      fontSize: 20,
      marginRight: spacing.sm,
      color: neumorphicColors.text.secondary,
    },
    input: {
      flex: 1,
      ...typography.body,
      color: neumorphicColors.text.primary,
      padding: 0,
    },
    errorText: {
      ...typography.caption,
      color: neumorphicColors.error.main,
      marginTop: spacing.xs,
      marginLeft: spacing.sm,
    },
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}

      <View
        style={[
          styles.inputContainer,
          getNeumorphicStyle(neumorphicColors, 'inset'),
          isFocused && styles.focused,
          error && styles.error,
        ]}
      >
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <TextInput
          {...textInputProps}
          style={[styles.input, textInputProps.style]}
          placeholderTextColor={neumorphicColors.text.disabled}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
        />
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

