/**
 * Decoder for Google's encoded-polyline format.
 *
 * Both Google Directions API and OSRM return route geometries in this
 * compact ASCII format — a string of ~5x fewer bytes than raw
 * lat/lng pairs. We inline the ~25-line decoder here instead of
 * pulling `@mapbox/polyline` as a dep; the algorithm has been frozen
 * for >15 years and we only need decode (never encode) for rendering
 * a `<Polyline>` on react-native-maps.
 *
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

import type { Coords } from './distance';

export function decodePolyline(encoded: string): Coords[] {
  if (typeof encoded !== 'string' || encoded.length === 0) return [];

  const points: Coords[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;

    // Decode latitude delta — variable-length integer, 5 bits per char.
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < encoded.length);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    // Decode longitude delta — same format, same loop.
    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < encoded.length);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    points.push({
      // The 1e5 divisor matches the encoder's fixed-point scaling.
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}
