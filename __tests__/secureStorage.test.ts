/**
 * Tests for the platform-aware secure key/value store in
 * `lib/api/secureStorage.ts`.
 *
 * The test envrionment uses the in-memory mocks from
 * `__tests__/__mocks__/{async-storage, expo-secure-store}.ts`. The
 * Platform mock pins OS to 'ios' so the SecureStore branch is
 * exercised — covering the happy paths through every public function.
 *
 * Cross-cutting expectations:
 *   - secureSet writes to SecureStore AND clears any legacy plaintext
 *     copy in AsyncStorage (defense-in-depth migration).
 *   - secureGet falls back to AsyncStorage when SecureStore returns null
 *     so legacy values keep working until the next set() migrates them.
 *   - migrateLegacyKeys is idempotent: a pre-migrated value is a no-op.
 */

import {
  secureGet,
  secureSet,
  secureRemove,
  secureMultiRemove,
  migrateLegacyKeys,
} from '../lib/api/secureStorage';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('secureStorage', () => {
  beforeEach(async () => {
    // Both mocks are in-memory; a `clear()` resets the dictionary that
    // backs them. AsyncStorage exposes clear(); SecureStore doesn't —
    // delete the canonical fixture keys instead.
    await AsyncStorage.clear();
    await SecureStore.deleteItemAsync('mobile_token');
    await SecureStore.deleteItemAsync('client_token');
    await SecureStore.deleteItemAsync('legacy_key');
  });

  test('secureSet writes to SecureStore and removes any AsyncStorage copy', async () => {
    // Pre-seed AsyncStorage to simulate a value left over from before
    // the migration (Day 3 #13). After secureSet the legacy slot must
    // be cleared.
    await AsyncStorage.setItem('mobile_token', 'leftover-plaintext');

    await secureSet('mobile_token', 'new-secure-value');

    const fromSecure = await SecureStore.getItemAsync('mobile_token');
    const fromLegacy = await AsyncStorage.getItem('mobile_token');
    expect(fromSecure).toBe('new-secure-value');
    expect(fromLegacy).toBeNull();
  });

  test('secureGet returns the SecureStore value when present', async () => {
    await SecureStore.setItemAsync('mobile_token', 'val');

    expect(await secureGet('mobile_token')).toBe('val');
  });

  test('secureGet does NOT consult AsyncStorage on a SecureStore miss', async () => {
    // Legacy plaintext values live in AsyncStorage until the explicit
    // `migrateLegacyKeys` sweep runs at boot (called from
    // AuthProvider). secureGet is intentionally one-store-only on
    // platforms where SecureStore is supported — auto-falling back
    // would silently keep using the unencrypted slot forever.
    await AsyncStorage.setItem('legacy_key', 'legacy-value');

    expect(await secureGet('legacy_key')).toBeNull();
  });

  test('secureGet returns null when SecureStore is empty', async () => {
    expect(await secureGet('mobile_token')).toBeNull();
  });

  test('secureRemove clears both SecureStore and AsyncStorage copies', async () => {
    await SecureStore.setItemAsync('mobile_token', 'in-secure');
    await AsyncStorage.setItem('mobile_token', 'in-legacy');

    await secureRemove('mobile_token');

    expect(await SecureStore.getItemAsync('mobile_token')).toBeNull();
    expect(await AsyncStorage.getItem('mobile_token')).toBeNull();
  });

  test('secureMultiRemove clears every key passed in', async () => {
    await SecureStore.setItemAsync('mobile_token', '1');
    await SecureStore.setItemAsync('client_token', '2');

    await secureMultiRemove(['mobile_token', 'client_token']);

    expect(await SecureStore.getItemAsync('mobile_token')).toBeNull();
    expect(await SecureStore.getItemAsync('client_token')).toBeNull();
  });

  test('migrateLegacyKeys copies AsyncStorage values into SecureStore once', async () => {
    await AsyncStorage.setItem('mobile_token', 'plain');

    await migrateLegacyKeys(['mobile_token']);

    expect(await SecureStore.getItemAsync('mobile_token')).toBe('plain');
    expect(await AsyncStorage.getItem('mobile_token')).toBeNull();
  });

  test('migrateLegacyKeys is a no-op when SecureStore already holds the key', async () => {
    // Pre-existing SecureStore value should not be overwritten by a
    // stale AsyncStorage copy. The migration is one-way and idempotent.
    await SecureStore.setItemAsync('mobile_token', 'fresh');
    await AsyncStorage.setItem('mobile_token', 'stale');

    await migrateLegacyKeys(['mobile_token']);

    expect(await SecureStore.getItemAsync('mobile_token')).toBe('fresh');
    // AsyncStorage value is untouched because we only sweep when the
    // SecureStore slot is empty — leaving it lets a future call clean
    // it up if SecureStore loses its data (post-OS-upgrade scenario).
    expect(await AsyncStorage.getItem('mobile_token')).toBe('stale');
  });

  test('migrateLegacyKeys handles multiple keys in one pass', async () => {
    await AsyncStorage.setItem('mobile_token', 'a');
    await AsyncStorage.setItem('client_token', 'b');

    await migrateLegacyKeys(['mobile_token', 'client_token']);

    expect(await SecureStore.getItemAsync('mobile_token')).toBe('a');
    expect(await SecureStore.getItemAsync('client_token')).toBe('b');
  });
});
