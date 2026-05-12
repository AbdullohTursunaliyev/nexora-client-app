/**
 * Tests for `lib/util/polyline.ts`.
 *
 * Pins the Google-encoded-polyline decoder against the canonical test
 * vector documented at:
 *   https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 *
 * The decoder is bitwise-heavy (5-bit chunks, zig-zag sign encoding,
 * fixed-point scaling) — easy to break with an off-by-one on shift or
 * sign reconstruction. These tests would catch any of those regressions.
 */

import { decodePolyline } from '../lib/util/polyline';

describe('decodePolyline', () => {
  test('decodes the canonical Google example to within 1e-5 degrees', () => {
    // Source: Google's polyline-utility docs. The 3 points decode to:
    //   (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const points = decodePolyline(encoded);

    expect(points).toHaveLength(3);

    // Use toBeCloseTo with precision 5 — the encoder scales by 1e5, so
    // values are deterministic to that decimal. Anything beyond is
    // floating-point noise we don't care about.
    expect(points[0].latitude).toBeCloseTo(38.5, 5);
    expect(points[0].longitude).toBeCloseTo(-120.2, 5);
    expect(points[1].latitude).toBeCloseTo(40.7, 5);
    expect(points[1].longitude).toBeCloseTo(-120.95, 5);
    expect(points[2].latitude).toBeCloseTo(43.252, 5);
    expect(points[2].longitude).toBeCloseTo(-126.453, 5);
  });

  test('returns empty array for empty / nullish / non-string input', () => {
    expect(decodePolyline('')).toEqual([]);
    // The signature is `string`, but defensive callers may pass us
    // anything via JSON.parse — cast through unknown to verify the
    // runtime guard.
    expect(decodePolyline(undefined as unknown as string)).toEqual([]);
    expect(decodePolyline(null as unknown as string)).toEqual([]);
  });

  test('decodes a single-point polyline correctly', () => {
    // OSRM may return a 1-point geometry for source==destination. We
    // shouldn't crash — but the consumer guards against <2 points
    // before drawing anyway.
    // The encoding for lat=38.5, lng=-120.2 is "_p~iF~ps|U".
    const points = decodePolyline('_p~iF~ps|U');
    expect(points).toHaveLength(1);
    expect(points[0].latitude).toBeCloseTo(38.5, 5);
    expect(points[0].longitude).toBeCloseTo(-120.2, 5);
  });

  test('produces lat/lng pairs (not lng/lat) — pre-fix order check', () => {
    // The encoded geometry from OSRM is `{lat},{lng}` per point, but
    // OSRM's REQUEST format is `{lng},{lat}`. We've been bitten before
    // by swapping the two — pin the output shape so it can't drift.
    const encoded = '_p~iF~ps|U';
    const [p] = decodePolyline(encoded);
    // Tashkent-like vs ocean — a clear-cut sanity check that the
    // decoded value is on land at 38.5°N, not at -120.2°N (which
    // doesn't exist).
    expect(Math.abs(p.latitude)).toBeLessThan(90);
    expect(Math.abs(p.longitude)).toBeLessThan(180);
  });
});
