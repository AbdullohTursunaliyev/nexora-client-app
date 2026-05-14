import { useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@nexora/favorite-clubs';

/**
 * Module-level singleton for the user's saved-clubs (favorites) list.
 *
 * Why a singleton (and not per-component useState):
 *
 * Pre-fix this hook spun up a NEW `useState` on every call site, so
 * ClubHero (heart toggle in the club detail page) and Favorites
 * (the saved-list screen) each had their own copy of the Set. Toggle
 * on ClubHero → ClubHero's state updated and persisted to
 * AsyncStorage, but the Favorites screen kept showing its stale
 * snapshot — the heart on Favorites still rendered as filled even
 * for a just-removed club. The Set only re-synced when the
 * Favorites screen REMOUNTED, which expo-router doesn't do on
 * `router.back()` (the screen is cached under the active route).
 *
 * Singleton fixes this by giving both components ONE shared Set +
 * a listener bus. Toggle in any component → singleton mutates →
 * every subscriber re-renders with the same Set in the same tick.
 * AsyncStorage persistence happens once per change at the singleton
 * layer, not per component.
 *
 * Storage format upgrade (v2):
 *   v1 stored a plain string array of ids: `["12","34"]`.
 *   v2 stores `{ id, addedAt }` records so we can sort newest-first
 *   on the Favorites screen — without this the order matched the
 *   underlying clubs catalog (alphabetical / proximity), which made
 *   it hard for a user with 20 favourites to find the one they JUST
 *   saved. We migrate v1 on first read.
 */

interface FavoriteEntry {
  id: string;
  /** Unix ms — when the user heart-tapped this club. Used for sort. */
  addedAt: number;
}

let currentFavorites = new Map<string, FavoriteEntry>();
let hydrated = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const cb of listeners) {
    try {
      cb();
    } catch {
      // A buggy subscriber must not tear down others.
    }
  }
}

async function persist(): Promise<void> {
  try {
    const arr = [...currentFavorites.values()];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Favourites aren't safety-critical state — swallow.
  }
}

async function hydrate(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      notify();
      return;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      notify();
      return;
    }
    const now = Date.now();
    for (const item of parsed) {
      // v1 → v2 migration: plain string ids become entries with an
      // unknown-but-bounded addedAt. We use `now - sequence_offset` so
      // later items in the array sort BELOW earlier ones (preserving
      // legacy order until the user starts adding new favourites).
      if (typeof item === 'string') {
        currentFavorites.set(item, {
          id: item,
          addedAt: now - currentFavorites.size,
        });
      } else if (
        item &&
        typeof item === 'object' &&
        typeof (item as FavoriteEntry).id === 'string'
      ) {
        const e = item as FavoriteEntry;
        currentFavorites.set(e.id, {
          id: e.id,
          addedAt: typeof e.addedAt === 'number' ? e.addedAt : now,
        });
      }
    }
  } catch {
    // Corrupt JSON — clear and start fresh.
    currentFavorites = new Map();
  }
  notify();
}

/**
 * Toggle membership. Used by the heart on club-details and the heart
 * on each row of the Favorites screen.
 *
 * Returns the new state (`true` = is now favorite, `false` = was
 * removed) so callers can show "added/removed" toast text without
 * a separate `isFavorite` re-read.
 */
export function toggleFavorite(clubId: string): boolean {
  const was = currentFavorites.has(clubId);
  if (was) {
    currentFavorites.delete(clubId);
  } else {
    currentFavorites.set(clubId, { id: clubId, addedAt: Date.now() });
  }
  notify();
  void persist();
  return !was;
}

/** Read-only check — does NOT trigger a re-render. */
export function getIsFavorite(clubId: string): boolean {
  return currentFavorites.has(clubId);
}

/** Wipe all favorites — exposed for a "Clear all" CTA. */
export function clearFavorites(): void {
  if (currentFavorites.size === 0) return;
  currentFavorites = new Map();
  notify();
  void persist();
}

/**
 * Subscribe + re-render hook. Mirrors the `useUnreadCount` pattern.
 *
 * Returns:
 *   - `favorites`: Set of ids (for fast `.has(id)` checks)
 *   - `isFavorite`: convenience reader
 *   - `toggle`: write-through helper
 *   - `entries`: full records sorted newest-first (for the Favorites
 *     screen which renders a chronological list)
 *   - `ready`: true once AsyncStorage hydration completes
 */
export function useFavoriteClubs() {
  // `tick` is the re-render trigger — incremented by the listener
  // callback whenever the singleton mutates. Components subscribing
  // to this hook re-render on every change to the shared Map.
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(hydrated);

  useEffect(() => {
    const cb = () => setTick((n) => n + 1);
    listeners.add(cb);
    if (!hydrated) {
      void hydrate().then(() => setReady(true));
    } else {
      setReady(true);
    }
    return () => {
      listeners.delete(cb);
    };
  }, []);

  // Derived projections of the Map. useMemo'd against `tick` so we
  // only rebuild when the singleton actually changed, not on every
  // parent re-render. Dependency on `tick` (not the Map itself) is
  // intentional — the Map is module-level and reading from it
  // doesn't trigger React's dependency system.
  const favorites = useMemo(() => {
    const ids = new Set<string>();
    for (const id of currentFavorites.keys()) ids.add(id);
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // Sorted newest-first — this is the order the Favorites screen
  // renders. Useful when a user has 10+ saves; the recent one sits
  // on top instead of buried inside the alphabetic discover order.
  const entries = useMemo<FavoriteEntry[]>(() => {
    return [...currentFavorites.values()].sort((a, b) => b.addedAt - a.addedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const isFavorite = useCallback(
    (clubId: string) => currentFavorites.has(clubId),
    [],
  );

  const toggle = useCallback((clubId: string) => toggleFavorite(clubId), []);

  return { favorites, isFavorite, toggle, entries, ready };
}
