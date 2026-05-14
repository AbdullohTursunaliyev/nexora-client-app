import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@nexora/selected-zone';

/**
 * Selected-zone state — module-level singleton.
 *
 * Pre-fix this used per-component `useState`. zone-select wrote
 * `select('vip')` to its own state + AsyncStorage, but the downstream
 * screens (seat-select, payment) each had their OWN useState that
 * started at `null` and never auto-loaded. The result: seat-select
 * always showed "PC Zone" / 20 000 so'm regardless of pick, payment
 * always read `zoneId = null`, and `useSelectedSeat(zoneId ?? 'pc')`
 * keyed the seat map under the wrong zone — so payment never found
 * the seat the user just picked, throwing `errorSeatUnavailable` and
 * making the entire booking flow unreachable.
 *
 * The singleton fixes that: every `useSelectedZone()` call reads from
 * (and re-renders on) the same in-memory value, so navigation between
 * stack screens preserves the pick automatically. AsyncStorage is still
 * touched as a best-effort persistence layer (cold-boot recovery) but
 * the hook does NOT block on it.
 */

let currentZoneId: string | null = null;
/**
 * Numeric BE zone id resolved by seat-select after it loads the
 * `/mobile/pcs/grid` response. Pre-fix the FE only tracked a stringified
 * FE-category key (`'pc'` / `'vip'` / `'ps5'`) — so time-select had no
 * way to filter slots by the actual BE zone the user is sitting in.
 *
 * Lifecycle:
 *   1. zone-select sets just the FE key (BE id unknown at that point)
 *   2. seat-select calls getPcGrid(), resolves the matching BE zone,
 *      and writes its numeric id back via setBeZoneId()
 *   3. time-select reads currentBeZoneId and passes it to
 *      listBookingSlots({ zoneId }) so peak pricing windows are scoped
 *      correctly to the user's actual zone
 *
 * Audit finding #10 (booking flow review): numeric zone id should be
 * threaded end-to-end so downstream calls don't fall back on
 * free-text name heuristics.
 */
let currentBeZoneId: number | null = null;
let storageHydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

/**
 * Hydrate once per process: read the persisted zone id from AsyncStorage
 * the first time any consumer mounts. Subsequent hooks attach instantly
 * to the in-memory value — they don't re-issue the storage read.
 *
 * Only the FE category key is persisted; the BE numeric id is
 * intentionally session-only since it depends on a live grid load
 * (the operator could have renumbered zones between sessions).
 */
async function hydrateOnce(): Promise<void> {
  if (storageHydrated) return;
  storageHydrated = true;
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    // Only adopt the stored value if no consumer has already written
    // one this session — otherwise we'd clobber the user's fresh pick
    // with a stale value on the storage round-trip.
    if (v && currentZoneId === null) {
      currentZoneId = v;
      notify();
    }
  } catch {
    // Storage unavailable — fall back to in-memory only.
  }
}

/**
 * Hard-reset the selected zone — used by `clearBookingSelections()`
 * after a successful booking so the next booking flow starts fresh.
 */
export function resetSelectedZone(): void {
  currentZoneId = null;
  currentBeZoneId = null;
  notify();
  // Best-effort wipe; failures here are silent (storage unavailable
  // shouldn't block navigation).
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

export function useSelectedZone() {
  // `tick` is a render bumper — when the singleton changes, we bump
  // it via `notify()` to force a re-render of every subscribed hook.
  const [, setTick] = useState(0);

  useEffect(() => {
    const cb = () => setTick((n) => n + 1);
    listeners.add(cb);
    void hydrateOnce();
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const select = useCallback(async (id: string) => {
    currentZoneId = id;
    // New zone category picked — invalidate any previously-resolved
    // BE id so seat-select re-resolves against the new bucket.
    currentBeZoneId = null;
    notify();
    try {
      await AsyncStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Same fall-back as hydrate — in-memory state is the source of
      // truth for the live session.
    }
  }, []);

  /**
   * Set the BE numeric zone id once seat-select has resolved which
   * specific zone in the grid corresponds to the user's FE category
   * pick. No-op when called with the same value (avoids redundant
   * re-renders during the seat-select mount).
   */
  const setBeZoneId = useCallback((id: number | null) => {
    if (currentBeZoneId === id) return;
    currentBeZoneId = id;
    notify();
  }, []);

  const clear = useCallback(async () => {
    currentZoneId = null;
    currentBeZoneId = null;
    notify();
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return {
    zoneId: currentZoneId,
    /** BE numeric zone id when known. See module-level docblock. */
    beZoneId: currentBeZoneId,
    select,
    setBeZoneId,
    clear,
    // `ready` stays true because callers read from the in-memory
    // singleton, not from an async source. The hydrate round-trip is
    // best-effort — UI doesn't gate on it.
    ready: true,
    /**
     * @deprecated kept for back-compat with old callers. The hook now
     * hydrates automatically on first mount; explicit calls are a no-op
     * beyond the first.
     */
    loadFromStorage: hydrateOnce,
  };
}

/**
 * Read-only variant kept for back-compat. Now just an alias for the
 * full hook — the singleton makes the read/write distinction
 * unnecessary.
 */
export function useReadSelectedZone(): {
  zoneId: string | null;
  beZoneId: number | null;
  ready: boolean;
} {
  const { zoneId, beZoneId, ready } = useSelectedZone();
  return { zoneId, beZoneId, ready };
}
