import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Platform-aware secure key/value store for auth tokens.
 *
 * Why not just AsyncStorage?
 *   AsyncStorage on Android is plain SQLite/MMKV without encryption — any
 *   app with broad storage access (or anyone with ADB backup) can read
 *   our `auth.mobile_token` and `auth.client_token` values verbatim.
 *   Both grant the holder 12h–30d of API access. SecureStore wraps
 *   Keystore (Android) and Keychain (iOS) so values are encrypted at
 *   rest with platform-managed keys.
 *
 * Why not SecureStore everywhere?
 *   SecureStore is unavailable on web and on certain Expo Go scenarios.
 *   For those we fall back to AsyncStorage (still better than nothing —
 *   the threat model on web is different anyway since browser storage
 *   is sandboxed per-origin).
 *
 * The keychain service name keeps Nexora keys segregated from any other
 * SecureStore consumers on the device.
 */

const SUPPORTS_SECURE_STORE = Platform.OS === 'ios' || Platform.OS === 'android';

const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  // KEYCHAIN_SERVICE on iOS — distinct namespace per app.
  keychainService: 'com.nexora.mobile.auth',
};

export async function secureGet(key: string): Promise<string | null> {
  if (SUPPORTS_SECURE_STORE) {
    try {
      return await SecureStore.getItemAsync(key, SECURE_OPTS);
    } catch {
      // SecureStore can throw on a corrupt store or first run after a
      // platform upgrade. Fall through to AsyncStorage so the app boots
      // rather than crashes.
    }
  }
  return AsyncStorage.getItem(key);
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (SUPPORTS_SECURE_STORE) {
    try {
      await SecureStore.setItemAsync(key, value, SECURE_OPTS);
      // Belt and suspenders: clear the legacy plaintext copy if any.
      await AsyncStorage.removeItem(key);
      return;
    } catch {
      // Fall through to AsyncStorage — see secureGet rationale.
    }
  }
  await AsyncStorage.setItem(key, value);
}

export async function secureRemove(key: string): Promise<void> {
  if (SUPPORTS_SECURE_STORE) {
    try {
      await SecureStore.deleteItemAsync(key, SECURE_OPTS);
    } catch {
      // ignore
    }
  }
  await AsyncStorage.removeItem(key);
}

export async function secureMultiRemove(keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => secureRemove(k)));
}

/**
 * Migrate legacy plaintext tokens out of AsyncStorage. Run once at boot —
 * if a value lives in AsyncStorage but not yet in SecureStore, copy it
 * over and delete the plaintext copy. Idempotent.
 */
export async function migrateLegacyKeys(keys: string[]): Promise<void> {
  if (!SUPPORTS_SECURE_STORE) return;

  for (const key of keys) {
    try {
      const inSecure = await SecureStore.getItemAsync(key, SECURE_OPTS);
      if (inSecure != null) continue;

      const inLegacy = await AsyncStorage.getItem(key);
      if (inLegacy == null) continue;

      await SecureStore.setItemAsync(key, inLegacy, SECURE_OPTS);
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore — best-effort migration. Worst case: the token still lives
      // in AsyncStorage which is no worse than today.
    }
  }
}
