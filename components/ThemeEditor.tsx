import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { ColorPicker } from 'react-native-color-picker';

const keysOf = <T extends {}>(obj: T) => Object.keys(obj) as Array<keyof T>;

const ThemeEditor: React.FC = () => {
  const { theme, customColors, updateColor, setCustomTheme, clearCustomTheme, saveCustomThemePreset, toggleTheme, isDarkMode } = useTheme();
  const [editing, setEditing] = useState<ThemeColors>(theme.colors);
  const [presetName, setPresetName] = useState<string>('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerKey, setPickerKey] = useState<keyof ThemeColors | null>(null);
  const [pickerColor, setPickerColor] = useState<string>('#ffffff');

  useEffect(() => {
    setEditing(theme.colors);
  }, [theme.colors]);

  const handleChange = (key: keyof ThemeColors, value: string) => {
    const clean = value.trim();
    setEditing(prev => ({ ...prev, [key]: clean } as ThemeColors));
    updateColor(key, clean);
  };

  const openPicker = (key: keyof ThemeColors) => {
    setPickerKey(key);
    const current = (editing as any)[key] || theme.colors[key];
    setPickerColor(current);
    setPickerVisible(true);
  };

  const applyPicker = (color?: string) => {
    if (!pickerKey) return;
    const chosen = color || pickerColor;
    setEditing(prev => ({ ...prev, [pickerKey]: chosen } as ThemeColors));
    updateColor(pickerKey, chosen);
    setPickerVisible(false);
    setPickerKey(null);
  };

  const handleSave = async () => {
    if (!presetName) return;
    try {
      await saveCustomThemePreset(presetName);
      setPresetName('');
      // feedback could be added
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Theme Editor</Text>
        <Button title={isDarkMode ? 'Light' : 'Dark'} onPress={toggleTheme} />
      </View>

      <View style={styles.preview}>
        <View style={[styles.previewCard, { backgroundColor: editing.card || theme.colors.card }]}> 
          <Text style={[styles.previewText, { color: editing.text || theme.colors.text }]}>Preview Text</Text>
        </View>
      </View>

      {keysOf(theme.colors).map(key => (
            <View key={String(key)} style={styles.row}>
              <Text style={styles.label}>{String(key)}</Text>
              <View style={styles.rowRight}>
                <TextInput
                  style={styles.input}
                  value={(editing as any)[key]}
                  onChangeText={(v) => handleChange(key as keyof ThemeColors, v)}
                  placeholder="#hex or rgba(...)"
                />
                <TouchableOpacity style={[styles.swatch, { backgroundColor: (editing as any)[key] || theme.colors[key] }]} onPress={() => openPicker(key as keyof ThemeColors)} />
              </View>
            </View>
          ))}

      <View style={styles.saveRow}>
        <TextInput style={styles.nameInput} placeholder="Preset name" value={presetName} onChangeText={setPresetName} />
        <Button title="Save Preset" onPress={handleSave} />
      </View>

      <View style={styles.clearRow}>
        <Button title="Clear Custom Colors" onPress={clearCustomTheme} />
      </View>
      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={pickerStyles.container}>
          <View style={pickerStyles.card}>
            <ColorPicker
              onColorSelected={(color: string) => applyPicker(color)}
              onColorChange={(color: string) => setPickerColor(color)}
              defaultColor={pickerColor}
              style={{ flex: 1, width: '100%' }}
            />
            <View style={pickerStyles.actions}>
              <Button title="Cancel" onPress={() => setPickerVisible(false)} />
              <Button title="Apply" onPress={() => applyPicker()} />
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, paddingBottom: 48 },
  header: { fontSize: 20, fontWeight: '600' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  preview: { marginBottom: 12 },
  previewCard: { padding: 12, borderRadius: 8, elevation: 2 },
  previewText: { fontSize: 16, fontWeight: '500' },
  row: { marginBottom: 10 },
  label: { marginBottom: 6, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6, backgroundColor: '#fff' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 36, height: 36, borderRadius: 6, borderWidth: 1, borderColor: '#ccc' },
  saveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  nameInput: { flex: 1, marginRight: 8, borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6, backgroundColor: '#fff' },
  clearRow: { marginTop: 12 },
});

export default ThemeEditor;

const pickerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    height: 420,
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
});
