// Centralized server configuration
// Provides a single source of truth for API + Socket URLs.
// Priority order:
// 1. Runtime global override (set in dev console): globalThis.RUNTIME_SERVER_URL
// 2. Expo extra (if using app.json / eas.json): Constants.expoConfig?.extra?.SERVER_URL
// 3. Environment variable injected at build time (process.env.SERVER_URL) - limited in RN
// 4. Fallback: production URL

import Constants from 'expo-constants';

const PROD_URL = 'https://mathgameapp.onrender.com';

export function getServerUrl(): string {
  // Runtime override (for quick switching without rebuild)
  if (typeof globalThis !== 'undefined' && (globalThis as any).RUNTIME_SERVER_URL) {
    return (globalThis as any).RUNTIME_SERVER_URL as string;
  }
  // Expo extra config
  const extraUrl = (Constants?.expoConfig as any)?.extra?.SERVER_URL;
  if (extraUrl) return extraUrl;
  // Build-time env (may be undefined in RN)
  const envUrl = (process as any)?.env?.SERVER_URL;
  if (envUrl) return envUrl;
  // Dev convenience: if __DEV__ and explicit dev flag set, allow localhost
  if (__DEV__ && (globalThis as any).USE_LOCAL_SERVER) {
    return 'http://localhost:3000';
  }
  return PROD_URL;
}

// Helper to set runtime override (debug tooling)
export function setRuntimeServerUrl(url: string) {
  (globalThis as any).RUNTIME_SERVER_URL = url;
}

export function clearRuntimeServerUrl() {
  delete (globalThis as any).RUNTIME_SERVER_URL;
}
