import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../api/config';

/**
 * Per-category notification preferences. Maps onto the same
 * `category` values the BE emits on `MobileNotification.category`
 * (`booking` / `tournament` / `promo` / `system`) — keys here are the
 * FE-friendly plural variants matched by `notifications.tsx::mapCategory`.
 *
 * `true` = the user wants this category delivered (push + bell badge).
 * `false` = mute — suppress from the bell badge count locally; future
 * push pipeline will honor it server-side.
 */
export interface NotificationPrefs {
  bookings: boolean;
  tournaments: boolean;
  offers: boolean;
  system: boolean;
}

/**
 * Default = everything on. A fresh install must NEVER silently start
 * with muted categories — the user has to opt out explicitly. Same
 * principle Apple / Google push pipelines follow.
 */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  bookings: true,
  tournaments: true,
  offers: true,
  system: true,
};

/**
 * Tiny hook that loads + writes per-category notification preferences
 * from AsyncStorage. Used by /notification-settings (the toggles UI)
 * and could be consumed by other surfaces later (e.g. the bell badge
 * could subtract muted categories from its count).
 *
 * Lifecycle:
 *   - On mount we read once; the loaded value replaces the defaults.
 *   - `update(partial)` merges + writes synchronously; the write is
 *     fire-and-forget (no await) because the UI doesn't block on it.
 *   - On JSON parse failure (corrupted storage) we silently fall
 *     back to defaults — better than crashing the screen and
 *     stranding the user.
 */
export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  // Track first-load completion separately so the UI can show a
  // brief loading spinner instead of flashing the defaults before
  // the user's saved choices arrive.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFS);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
          // Merge with defaults so a stored object missing a future
          // key (e.g. we add `friend_requests` later) doesn't show
          // up as undefined → falsy → muted.
          setPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...parsed });
        }
      } catch {
        // Corrupted JSON / read failure — keep defaults.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(
    (partial: Partial<NotificationPrefs>) => {
      setPrefs((curr) => {
        const next = { ...curr, ...partial };
        // Fire-and-forget — the UI already reflects the new state via
        // the React setter above. A write failure here only matters
        // on the NEXT app launch, and the toggle still works in-session.
        AsyncStorage.setItem(
          STORAGE_KEYS.NOTIFICATION_PREFS,
          JSON.stringify(next),
        ).catch(() => {});
        return next;
      });
    },
    [],
  );

  return { prefs, update, loaded };
}
