import React from 'react';
import { TextInput, StyleSheet, ViewStyle, TextInputProps, View, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface Props extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle | any;
}

export const NeumorphicInput: React.FC<Props> = ({ label, containerStyle, style, ...props }) => {
  const { theme } = useTheme();
  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text> : null}
      <TextInput style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }, style]} placeholderTextColor={theme.colors.placeholderText} {...props} />
    </View>
  );
};

const styles = StyleSheet.create({
  label: { marginBottom: 6, color: '#333' },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
});

export default NeumorphicInput;

