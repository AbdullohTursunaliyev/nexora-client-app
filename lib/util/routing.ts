/**
 * In-app routing service.
 *
 * The discover map shows a road-following polyline between the user's
 * current GPS coords and a tapped club — same UX as Yandex/Google
 * Maps' "directions" overlay, but rendered INSIDE our app instead of
 * deep-linking out to a third-party maps app. Two reasons we don't
 * deep-link any more for this CTA:
 *
 *  1. Retention: every external handoff is a chance for the user to
 *     drift into Yandex.Taxi or Google Maps and forget to come back
 *     and complete their booking.
 *  2. Branding: a route drawn on our own dark-mode tiles with our
 *     cyan accent reads as one continuous Nexora experience.
 *
 * Provider: OSRM (Open Source Routing Machine) public demo server.
 *
 *  - Free, no API key, no billing required.
 *  - Returns Google-style encoded polyline + duration + distance in
 *    the same shape Google Directions API uses, so swapping later is
 *    a one-line change.
 *  - "For testing and development purposes only" per OSRM ToS — fair
 *    use is roughly 1 req/sec sustained. A gaming-cafe app where the
 *    user taps "directions" maybe twice per session sits well under
 *    that envelope. If we ever exceed it we'll either self-host OSRM
 *    on Railway (one container, ~$5/mo) or switch to Mapbox Directions
 *    (free tier covers ~100K req/mo) by editing only this file.
 *
 * Failure model: if the routing call fails (network down, OSRM 503,
 * 5xx for malformed coords) we don't surface a hard error — we fall
 * back to a "crow-flies" straight-line polyline + a 30 km/h average
 * urban estimate so the map still shows SOMETHING. The result object
 * carries `isFallback: true` so the UI can soft-warn ("approximate").
 */

import { haversine, type Coords } from './distance';
import { decodePolyline } from './polyline';

export interface RouteResult {
  /** Polyline coordinates that follow real roads (or a 2-point straight line in fallback). */
  coordinates: Coords[];
  /** Route length in kilometres (along the polyline, or great-circle for fallback). */
  distanceKm: number;
  /** Estimated travel time in minutes (driving profile). */
  durationMin: number;
  /** True when OSRM was unreachable and we returned a straight-line estimate. */
  isFallback: boolean;
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
// 8s is generous for a global routing call but bounded so the UI
// doesn't sit on an indefinite spinner if the demo server stalls.
const TIMEOUT_MS = 8000;

/**
 * Fetch a driving route between two points.
 *
 * @param from  Origin coords (typically the user's current GPS position).
 * @param to    Destination coords (typically the tapped club).
 * @param signal Optional AbortSignal — if the user cancels (e.g. taps
 *               another marker mid-fetch), the orchestrating component
 *               can abort the in-flight request instead of letting it
 *               race the new one.
 */
export async function fetchRoute(
  from: Coords,
  to: Coords,
  signal?: AbortSignal,
): Promise<RouteResult> {
  // Guard against malformed inputs. The MapClub adapter sometimes
  // returns 0/0 for clubs missing geolocation in the BE — drawing a
  // line into the Atlantic Ocean would be confusing.
  if (
    !Number.isFinite(from?.latitude) ||
    !Number.isFinite(from?.longitude) ||
    !Number.isFinite(to?.latitude) ||
    !Number.isFinite(to?.longitude) ||
    (to.latitude === 0 && to.longitude === 0)
  ) {
    return fallback(from, to);
  }

  // OSRM expects `{lng},{lat}` per point (it's the GeoJSON convention,
  // opposite of how we usually write coords). Easy to flip by accident.
  const url =
    `${OSRM_BASE}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=full&geometries=polyline`;

  const ac = new AbortController();
  // If the caller passed a signal, chain it so their abort cancels
  // our timeout race too.
  if (signal) {
    if (signal.aborted) ac.abort();
    else signal.addEventListener('abort', () => ac.abort(), { once: true });
  }
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = await res.json();
    if (
      data?.code !== 'Ok' ||
      !Array.isArray(data.routes) ||
      data.routes.length === 0
    ) {
      throw new Error('OSRM: no route in response');
    }
    const route = data.routes[0];
    const coordinates = decodePolyline(String(route?.geometry ?? ''));
    if (coordinates.length < 2) throw new Error('OSRM: empty polyline');

    const distance = Number(route?.distance);
    const duration = Number(route?.duration);
    return {
      coordinates,
      distanceKm: Number.isFinite(distance) ? distance / 1000 : haversine(from, to),
      durationMin: Number.isFinite(duration)
        ? duration / 60
        : (haversine(from, to) / 30) * 60,
      isFallback: false,
    };
  } catch (err) {
    // The caller's abort propagates out — they're switching to a new
    // route anyway, don't synthesise a stale fallback for it.
    if (signal?.aborted) throw err;
    return fallback(from, to);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Straight-line fallback for when OSRM is unreachable or coords are
 * malformed. Better than a dead button — the user still sees a line
 * pointing at the club and a rough ETA. The polyline is just 2
 * points; the consumer's `fitToCoordinates` call handles framing.
 */
function fallback(from: Coords, to: Coords): RouteResult {
  const distanceKm = haversine(from, to);
  // 30 km/h is a Tashkent-traffic average — fast enough for highway,
  // slow enough for city centre. Not perfect, just less wrong than
  // showing nothing.
  const durationMin = distanceKm > 0 ? (distanceKm / 30) * 60 : 0;
  return {
    coordinates: [
      { latitude: from.latitude, longitude: from.longitude },
      { latitude: to.latitude, longitude: to.longitude },
    ],
    distanceKm,
    durationMin,
    isFallback: true,
  };
}
