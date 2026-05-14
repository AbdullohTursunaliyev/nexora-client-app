import { useEffect, useState } from 'react';
import { Images } from '../../constants/Images';
import { listNearby } from '../api/services/discover';
import { authEvents } from '../api/client';
import { TASHKENT_CENTER, type MapClub, type ClubType } from '../data/clubs';
import { logWarn } from '../util/logger';

/**
 * Live source of truth for club listings.
 *
 * Replaces the long-lived hardcoded MAP_CLUBS array. Every consumer
 * that previously imported `MAP_CLUBS` now calls this hook instead and
 * gets the real `/mobile/discover/clubs` response, mapped onto the
 * existing `MapClub` shape so screens, map markers and the wallet
 * picker keep rendering without per-component refactors.
 *
 * Backend-vs-FE shape gaps we paper over here:
 *
 *   - `lat`/`lng`: the seed tenants don't carry coordinates yet, so we
 *     deterministically fan them out around the city centre (small
 *     index-based offsets keep markers from overlapping on the map).
 *   - `type` ('pc' | 'ps' | 'mixed'): BE only exposes
 *     `has_ps_zone` + `pc_count`. We derive the union here.
 *   - `cover_url` / `gallery`: falls back to bundled images when the
 *     tenant hasn't uploaded one yet.
 *
 * The fetch fires once per mount; the response is also stashed in
 * `cache` so a second consumer in the same session renders synchronously
 * with whatever the first one fetched. (No SWR-style revalidation —
 * keep simple; bookings/wallet/etc. each fetch their own scoped data.)
 *
 * Invalidation rules:
 *   - On `auth:unauthorized` the cache is cleared so the next user
 *     logging in doesn't inherit the previous user's `joined: true`
 *     flags (would render someone else's clubs in the "Mine" tab).
 *   - Concurrent mounts share a single in-flight promise so two
 *     simultaneous renders don't double-fire `/mobile/discover/clubs`.
 *   - Mounts that arrive while a refresh is already in flight wait for
 *     that promise instead of starting a parallel request.
 *
 * `subscribers` is the set of `setClubs` setters for every mounted
 * instance, so a programmatic invalidation (e.g. after `clubJoin`) can
 * push fresh data to every consumer in one shot.
 */
let cache: MapClub[] | null = null;
let inflight: Promise<MapClub[]> | null = null;
const subscribers = new Set<(clubs: MapClub[]) => void>();

/**
 * Force-clear the cache + notify every mounted consumer that the data
 * is now empty. Exported so explicit "the user just joined a club"
 * paths can call it without waiting for the next mount.
 */
export function clearDiscoverCache(): void {
  cache = null;
  inflight = null;
  for (const setter of subscribers) {
    setter([]);
  }
}

// Wire the auth bus once — multiple imports of this module are fine
// because Set.add on the same listener is a no-op. Top-level so the
// subscription survives unmounts.
authEvents.on('auth:unauthorized', () => {
  clearDiscoverCache();
});
// Same reset on explicit logout — `joined` flags are user-specific so
// the cache must clear before the next user logs in (audit deep #2
// follow-up).
authEvents.on('auth:logout', () => {
  clearDiscoverCache();
});

interface DiscoverApiClub {
  id: string;
  name: string;
  rating: number | null;
  review_count: number;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  pc_count: number;
  has_ps_zone: boolean;
  is_open: boolean;
  open_24h: boolean;
  cover_url: string;
  address: string;
  joined: boolean;
  discount_text: string | null;
}

function deriveType(api: DiscoverApiClub): ClubType {
  if (api.has_ps_zone && api.pc_count > 0) return 'mixed';
  if (api.has_ps_zone) return 'ps';
  return 'pc';
}

function fillCoords(api: DiscoverApiClub, idx: number): { lat: number; lng: number } {
  if (api.lat != null && api.lng != null) {
    return { lat: api.lat, lng: api.lng };
  }
  // Spiral-ish offset around the city centre so synthetic pins don't
  // sit on top of each other when several clubs lack coordinates.
  // Tiny deltas (0.005°) keep them within ~500m which still reads as
  // "central Tashkent" until the BE backfills real lat/lng.
  const angle = idx * 0.9;
  return {
    lat: TASHKENT_CENTER.latitude + Math.sin(angle) * 0.005 * (1 + idx % 3),
    lng: TASHKENT_CENTER.longitude + Math.cos(angle) * 0.005 * (1 + idx % 3),
  };
}

function adapt(api: DiscoverApiClub, idx: number): MapClub {
  const { lat, lng } = fillCoords(api, idx);
  const fallbackImage = Images.clubs[idx % Images.clubs.length];
  const cover = api.cover_url && api.cover_url.length > 0 ? api.cover_url : fallbackImage;

  // Pad the gallery up to 4 photos. The BE only ships a single
  // `cover_url` today, so without padding the club-details screen
  // showed exactly one tiny thumbnail row — useless as a "gallery".
  // We start with the cover and walk Images.clubs from a per-club
  // deterministic offset, skipping duplicates of the cover itself.
  // When the BE eventually returns a real photo list, swap this with
  // `api.photos ?? [...]` and drop the padding loop.
  const gallery: string[] = [cover];
  for (let i = 0; i < Images.clubs.length && gallery.length < 4; i++) {
    const next = Images.clubs[(idx + i + 1) % Images.clubs.length];
    if (!gallery.includes(next)) gallery.push(next);
  }

  // Defensive numeric guards: TypeScript types these as `number` but
  // a future BE drift (or a broken row) could surface NaN / null which
  // would render as "NaN" on the chip. `Number.isFinite` is the
  // canonical "is this a usable number" check — it rejects NaN,
  // Infinity, and null after coercion.
  const safeRating = Number.isFinite(Number(api.rating)) ? Number(api.rating) : 0;
  const safeReviewCount = Number.isFinite(Number(api.review_count))
    ? Number(api.review_count)
    : 0;
  const safeDistance = Number.isFinite(Number(api.distance_km))
    ? Number(api.distance_km)
    : 0;
  const safePcCount = Number.isFinite(Number(api.pc_count)) ? Number(api.pc_count) : 0;

  return {
    id: api.id,
    name: api.name ?? '',
    type: deriveType(api),
    lat,
    lng,
    rating: safeRating,
    reviewCount: safeReviewCount,
    pcCount: safePcCount,
    hasPSZone: !!api.has_ps_zone,
    open24h: !!api.open_24h,
    isOpen: !!api.is_open,
    distanceKm: safeDistance,
    image: cover,
    gallery,
    joined: !!api.joined,
    verified: true,
    address: api.address ?? '',
    description: '',
    discountText: api.discount_text ?? undefined,
  };
}

export function useDiscoverClubs(): {
  clubs: MapClub[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [clubs, setClubs] = useState<MapClub[]>(() => cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  /**
   * Fetch / refetch. Always returns a Promise that resolves after the
   * cache is updated, so callers awaiting `refresh()` (e.g. pull-to-
   * refresh) see the new clubs immediately. The in-flight dedupe means
   * three pull-to-refresh taps within 500ms still only fire one request.
   *
   * Loading state: each hook instance has its own `loading` flag — the
   * `try { await inflight }` path must still flip *this* instance's
   * flag false when the shared request resolves, otherwise a second
   * mount during fetch never leaves the skeleton state.
   */
  const refresh = async (): Promise<void> => {
    if (inflight) {
      try {
        await inflight;
      } catch {
        // The original request's error already reached its caller; we
        // don't want to double-log here.
      }
      setLoading(false);
      return;
    }

    inflight = (async () => {
      try {
        const raw = (await listNearby()) as unknown as DiscoverApiClub[];
        const mapped = raw.map((c, idx) => adapt(c, idx));
        cache = mapped;
        // Push to every mounted consumer at once. setClubs on this
        // instance is included via the subscribers set.
        for (const setter of subscribers) setter(mapped);
        return mapped;
      } catch (err) {
        // Log to Metro console so a failed fetch surfaces during dev —
        // previously this was silent and a 401 / network error left
        // the home tab showing an empty state that looked like a
        // legitimate "no clubs" result. The response interceptor
        // already kicks off the logout path for a dead mobile_token,
        // so we don't need to re-handle that here.
        // eslint-disable-next-line no-console
        logWarn('[useDiscoverClubs] fetch failed', err);
        return cache ?? [];
      } finally {
        inflight = null;
      }
    })();

    await inflight;
    setLoading(false);
  };

  useEffect(() => {
    subscribers.add(setClubs);
    if (cache) {
      setClubs(cache);
      setLoading(false);
    } else {
      void refresh();
    }
    return () => {
      subscribers.delete(setClubs);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { clubs, loading, refresh };
}

/** For non-React callers (rare). Returns whatever the cache holds. */
export function getCachedClubs(): MapClub[] {
  return cache ?? [];
}
