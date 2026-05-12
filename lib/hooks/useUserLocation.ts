import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Coords } from '../util/distance';

/**
 * Shared user-location state.
 *
 * The discover MapView and the surrounding screen both need access to
 * the user's current coords — the map shows the GPS dot + handles
 * recenter, the screen needs them to compute distance from each club
 * for the selected-club subtitle. Without sharing, the MapView held
 * the coords locally and downstream consumers fell back to the
 * BE-supplied `distance_km: null` → 0, which surfaced in the card as
 * "0.0 km" right under every selected club's name.
 *
 * Architecture: module-level singleton + a pub/sub of setters. Any
 * mounted `useUserLocation` consumer renders synchronously with the
 * cache on mount and re-renders whenever `setUserLocationGlobal` is
 * called (from anywhere — typically the MapView's request-GPS flow).
 *
 * Permission policy: this module NEVER prompts. It only reads coords
 * if the OS already granted foreground location. The discover MapView
 * is the single place that asks for permission (via `usePermissionGate`)
 * — once that flow lands a `granted`, it calls `setUserLocationGlobal`
 * and every consumer wakes up.
 *
 * Two operating modes:
 *   • Idle (default) — one-shot silent read at first mount, coords
 *     stay frozen until something explicitly refreshes them.
 *   • Watching — continuous high-frequency stream via
 *     `Location.watchPositionAsync`. Used by the in-app navigation
 *     mode so the map dot moves in real-time and the camera can
 *     follow. Heading (compass bearing from GPS-derived velocity) is
 *     also published while watching, so the nav arrow can rotate.
 *
 * The watch is ref-counted — multiple consumers (the MapView and the
 * surrounding screen, say) can both request it and only the last
 * `stopUserLocationWatch()` actually tears the OS subscription down.
 */

let cached: Coords | null = null;
const subscribers = new Set<(c: Coords | null) => void>();
let silentLoadTriggered = false;

// Heading is tracked separately so the basic `Coords` consumer doesn't
// have to widen its type (a lot of callers just want latitude/longitude
// for distance math). Null means "stationary or unknown" — the OS
// returns a negative heading when there's no movement to derive
// bearing from.
let cachedHeading: number | null = null;
const headingSubscribers = new Set<(h: number | null) => void>();

// Single ref-counted OS subscription — the second simultaneous
// `watchPositionAsync` would have its own native sensor lock and
// drain battery twice as fast.
let positionWatcher: Location.LocationSubscription | null = null;
let positionWatchRefCount = 0;
// Promise the lifecycle effect awaits to avoid a race where two
// near-simultaneous start calls each see `positionWatcher === null`
// and both kick off a `watchPositionAsync`. The second one would
// then leak (its handle stored over the first's).
let positionWatchStarting: Promise<void> | null = null;

function notify() {
  for (const fn of subscribers) fn(cached);
}

function notifyHeading() {
  for (const fn of headingSubscribers) fn(cachedHeading);
}

/**
 * Update the shared coords from outside (e.g. MapView's request flow
 * just acquired a fresh position). Pass null to clear (logout etc.).
 */
export function setUserLocationGlobal(next: Coords | null): void {
  cached = next;
  notify();
}

/**
 * Update the shared heading (compass bearing in degrees, 0=N, 90=E).
 * Pass null when the device is stationary — the map can decide whether
 * to keep the last heading or fall back to north-up.
 */
export function setUserHeadingGlobal(next: number | null): void {
  cachedHeading = next;
  notifyHeading();
}

async function tryLoadSilently(): Promise<void> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setUserLocationGlobal({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
  } catch {
    // Hardware off / airplane mode / OS denial — leave cache null.
  }
}

/**
 * Subscribe to the shared user-location singleton.
 *
 * @returns `coords` — current cached position, or null if unknown.
 *
 * Component flow:
 *   1. First mount of any consumer triggers a silent location read
 *      (no permission prompt — only resolves if already granted).
 *   2. Consumers add themselves to the subscriber set so the next
 *      `setUserLocationGlobal` call flips their local state.
 *   3. Unmount cleanly removes the subscriber.
 */
export function useUserLocation(): Coords | null {
  const [coords, setCoords] = useState<Coords | null>(cached);

  useEffect(() => {
    subscribers.add(setCoords);
    if (!cached && !silentLoadTriggered) {
      silentLoadTriggered = true;
      void tryLoadSilently();
    }
    return () => {
      subscribers.delete(setCoords);
    };
  }, []);

  return coords;
}

/**
 * Subscribe to the shared user-heading singleton — degrees clockwise
 * from north, 0..360. Null when stationary or unknown.
 *
 * Only meaningful while `startUserLocationWatch` is active; idle
 * one-shot reads don't produce heading.
 */
export function useUserHeading(): number | null {
  const [heading, setHeading] = useState<number | null>(cachedHeading);

  useEffect(() => {
    headingSubscribers.add(setHeading);
    return () => {
      headingSubscribers.delete(setHeading);
    };
  }, []);

  return heading;
}

/**
 * Start a high-frequency position watch (continuous GPS updates).
 *
 * Ref-counted: the first caller actually opens the OS subscription;
 * subsequent callers just bump the count. The matching number of
 * `stopUserLocationWatch()` calls (one per `start`) tears it down.
 *
 * Why this matters: when a consumer enters navigation mode we want
 * roughly 1.5s / 3m updates for smooth marker animation. But if two
 * mounted components both call this, we MUST keep a single underlying
 * watch — otherwise we double the battery cost and both end up trying
 * to update the same global on every emission.
 *
 * Returns a `stop` function that the caller should invoke on unmount
 * or when leaving nav mode. Idempotent — extra calls are no-ops.
 */
export async function startUserLocationWatch(): Promise<() => void> {
  positionWatchRefCount++;

  // Already watching — just bump the count, return a stopper.
  if (positionWatcher) return makeStopper();
  // A start is already in flight — wait for it instead of racing.
  if (positionWatchStarting) {
    await positionWatchStarting;
    return makeStopper();
  }

  positionWatchStarting = (async () => {
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        // No permission → no watch, but keep the ref count honest
        // so the caller's stopper still decrements correctly.
        return;
      }
      // High accuracy is essential for nav-style follow. timeInterval
      // and distanceInterval together throttle the callback rate —
      // we get whichever fires first. 1.5s + 3m is a balance between
      // smooth animation (faster = smoother) and battery (slower =
      // longer battery). Yandex Maps uses ~1s in active nav; we go
      // slightly slower to stay friendlier to non-charging users.
      positionWatcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1500,
          distanceInterval: 3,
        },
        (loc) => {
          setUserLocationGlobal({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          // `coords.heading` is degrees from true north when moving,
          // -1 when the device hasn't moved enough to compute one.
          // We normalise the negative sentinel to null so consumers
          // have a single "no heading" representation.
          const h =
            typeof loc.coords.heading === 'number' && loc.coords.heading >= 0
              ? loc.coords.heading
              : null;
          setUserHeadingGlobal(h);
        },
      );
    } catch {
      // Sensor unavailable, OS denied between perm check and watch,
      // etc. We bail silently — the consumer's UI already has a null-
      // location code path (the GPS-denied banner on MapView).
      positionWatcher = null;
    } finally {
      positionWatchStarting = null;
    }
  })();

  await positionWatchStarting;
  return makeStopper();
}

function makeStopper(): () => void {
  let used = false;
  return () => {
    if (used) return;
    used = true;
    stopUserLocationWatch();
  };
}

function stopUserLocationWatch(): void {
  positionWatchRefCount = Math.max(0, positionWatchRefCount - 1);
  if (positionWatchRefCount === 0 && positionWatcher) {
    positionWatcher.remove();
    positionWatcher = null;
    // Drop the heading on tear-down so a stale "user was facing east"
    // doesn't bleed into the next nav session 10 minutes later.
    setUserHeadingGlobal(null);
  }
}
