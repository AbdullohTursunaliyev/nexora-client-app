/**
 * Geo distance helpers — no dependencies, safe to call from anywhere.
 */

export interface Coords {
  latitude: number;
  longitude: number;
}

/**
 * Great-circle distance in kilometres between two lat/lng points,
 * via the haversine formula. Accurate to within ~0.5% across normal
 * mobile-app distances (clubs in the same city). Earth radius taken
 * as 6371 km (mean radius — good enough; we don't need WGS84 precision
 * for a discover screen).
 *
 * Returns 0 if either input is malformed (NaN / undefined coords),
 * which the SelectedClubCard / DiscoverList consumers already treat
 * as "hide the distance label".
 */
export function haversine(a: Coords, b: Coords): number {
  if (
    !Number.isFinite(a?.latitude) ||
    !Number.isFinite(a?.longitude) ||
    !Number.isFinite(b?.latitude) ||
    !Number.isFinite(b?.longitude)
  ) {
    return 0;
  }
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, h)));
}
