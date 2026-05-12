/**
 * API Configuration
 *
 * The base URL is read from `process.env.EXPO_PUBLIC_API_URL`. Set it in a
 * top-level `.env` (see `.env.example`) and restart the bundler:
 *
 *   EXPO_PUBLIC_API_URL=http://192.168.0.154:8080/api  # local dev
 *   EXPO_PUBLIC_API_URL=https://api.nexora.uz/api      # production
 *
 * For local testing your phone and computer must share a Wi-Fi network and
 * the IP must be your computer's LAN address (PowerShell: `ipconfig`).
 *
 * In `__DEV__` builds we fall back to `http://localhost:8080/api` if the
 * env var is missing, but in production we hard-fail at module load — a
 * release build with no API URL would silently route to localhost which
 * doesn't exist on the user's device.
 *
 * Production also rejects any non-`https://` URL: AsyncStorage tokens
 * + plaintext HTTP on public Wi-Fi means trivial credential interception.
 */

const ENV_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();

function resolveBaseUrl(): string {
  if (ENV_URL) {
    if (!__DEV__ && !ENV_URL.startsWith('https://')) {
      throw new Error(
        '[NEXORA] EXPO_PUBLIC_API_URL must use https:// in production. ' +
          'Plaintext HTTP exposes auth tokens on public networks.',
      );
    }
    return ENV_URL;
  }

  if (!__DEV__) {
    throw new Error(
      '[NEXORA] EXPO_PUBLIC_API_URL is required in production builds. ' +
        'Set it in your release env (e.g. EAS Build secrets) before shipping.',
    );
  }

  // Dev fallback — keeps Expo Go working out-of-the-box on the simulator.
  return 'http://localhost:8080/api';
}

export const API_BASE_URL = resolveBaseUrl();

// API timeout (milliseconds).
export const API_TIMEOUT = 15000; // 15s

// AsyncStorage keys (token storage migration to expo-secure-store is tracked
// separately — see AUDIT.md #13).
export const STORAGE_KEYS = {
  MOBILE_TOKEN: 'auth.mobile_token',
  CLIENT_TOKEN: 'auth.client_token',
  USER: 'auth.user',
  CURRENT_TENANT: 'auth.current_tenant_id',
} as const;
