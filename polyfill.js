// Minimal polyfill for react-native-svg buffer requirement
import { Buffer } from 'buffer';

// Make Buffer available globally for react-native-svg
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}