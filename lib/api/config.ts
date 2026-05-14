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

/**
 * AsyncStorage keys — SINGLE SOURCE OF TRUTH for every key the app
 * writes to local storage. Pre-fix this map only covered the auth
 * tokens; the rest were scattered across `lib/state/*` hooks,
 * `app/(tabs)/profile.tsx`, `app/index.tsx`, `app/onboarding.tsx`
 * and `lib/i18n/LocaleProvider.tsx` as inline constants — and one
 * (`hasSeenOnboarding`) was bare, with no app prefix, so any other
 * app on the device using the same name would collide on Android's
 * shared SharedPreferences backend. Audit findings M4 + L1 + L2.
 *
 * Naming conventions preserved (not unified) because changing a key
 * value would orphan existing user data:
 *   - `auth.*` / `prefs.*` — config-layer keys (this file's origin)
 *   - `@nexora/*` — state-hook keys (`lib/state/*`)
 *   - `hasSeenOnboarding` — legacy bare key, kept verbatim to avoid
 *     re-running onboarding for users who already finished it
 *   - `nexora.profile.soonCollapsed` — legacy dot-prefixed key
 *
 * Future keys should follow `@nexora/<area>-<thing>` for
 * consistency with the state-hook bucket.
 *
 * Token storage migration to expo-secure-store is tracked separately
 * — see AUDIT.md #13.
 */
export const STORAGE_KEYS = {
  // ── Auth tokens + user identity ──
  MOBILE_TOKEN: 'auth.mobile_token',
  CLIENT_TOKEN: 'auth.client_token',
  USER: 'auth.user',
  CURRENT_TENANT: 'auth.current_tenant_id',

  // ── Per-feature preferences (config-layer) ──
  /**
   * Per-category push preferences. Stored as a JSON-stringified
   * { bookings: bool, tournaments: bool, offers: bool, system: bool }
   * object. Defaults to all-on; missing key = all-on so a fresh
   * install never silently mutes the user. See app/notification-settings.tsx.
   */
  NOTIFICATION_PREFS: 'prefs.notifications',

  // ── Onboarding gate + profile UI state ──
  /**
   * Set to `'true'` after the user finishes the 3-slide onboarding.
   * Read by `app/index.tsx` to decide between /onboarding and /login.
   * Key stays bare (`hasSeenOnboarding`) for back-compat with users
   * who already saw onboarding on prior builds — renaming would
   * re-trigger the flow for everyone, which is worse than the
   * theoretical Android-shared-storage collision.
   */
  ONBOARDING_SEEN: 'hasSeenOnboarding',
  /** Profile screen "Soon" section collapsed/expanded toggle. */
  PROFILE_SOON_COLLAPSED: 'nexora.profile.soonCollapsed',

  // ── State-hook keys (mirrored from `lib/state/*` for discoverability) ──
  LOCALE: '@nexora/locale',
  DISCOVER_FILTER: '@nexora/discover-filter',
  DISCOVER_ADVANCED: '@nexora/discover-advanced',
  FAVORITE_CLUBS: '@nexora/favorite-clubs',
  WALLET_SELECTED_CLUB: '@nexora/wallet-selected-club',
  SELECTED_ZONE: '@nexora/selected-zone',
} as const;
