import { Platform, StatusBar } from 'react-native';

/**
 * Safe fallback for getting bottom inset when SafeAreaProvider is not available
 * Estimates bottom inset based on platform and device characteristics
 */
export function getSafeBottomInset(): number {
  if (Platform.OS === 'android') {
    // Android devices with gesture navigation typically have ~20-40px bottom inset
    // Devices with button navigation have 0
    // We'll use a safe default of 20px
    return 20;
  }
  // iOS devices
  return 34; // Standard iPhone bottom inset
}

/**
 * Safe wrapper for useSafeAreaInsets with fallback
 */
export function useSafeSafeAreaInsets(insets?: { top: number; bottom: number; left: number; right: number }) {
  if (insets) {
    return insets;
  }

  return {
    top: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 44,
    bottom: getSafeBottomInset(),
    left: 0,
    right: 0,
  };
}
