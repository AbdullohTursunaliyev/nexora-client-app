/**
 * Tests for `lib/util/routing.ts`.
 *
 * Covers the three branches a caller cares about:
 *   1. Happy path — OSRM returns OK, we decode geometry + km/min.
 *   2. Network failure — `fetch` throws; we fall back to a
 *      straight-line polyline + haversine distance + 30 km/h estimate.
 *   3. Malformed destination (0,0 sentinel) — we skip the network
 *      call entirely and return the fallback so the UI doesn't draw
 *      a line into the Atlantic Ocean.
 *
 * The OSRM endpoint is mocked at the `global.fetch` level — no real
 * network in tests. Keeps the suite fast (< 1s) and deterministic.
 */

import { fetchRoute } from '../lib/util/routing';

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

describe('fetchRoute', () => {
  const TASHKENT = { latitude: 41.3111, longitude: 69.2797 };
  const SAMARKAND = { latitude: 39.6542, longitude: 66.9597 };

  test('returns decoded polyline + km / min when OSRM responds OK', async () => {
    // Encoded geometry for two points in central Tashkent (~1 km
    // apart). The exact decoded values aren't load-bearing — the
    // assertion is "we used what OSRM returned, not the fallback".
    const mockResponse = {
      code: 'Ok',
      routes: [
        {
          geometry: '_p~iF~ps|U_ulLnnqC',
          // 5200 m = 5.2 km
          distance: 5200,
          // 720 s = 12 min
          duration: 720,
        },
      ],
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    }) as unknown as typeof fetch;

    const result = await fetchRoute(TASHKENT, SAMARKAND);

    expect(result.isFallback).toBe(false);
    expect(result.distanceKm).toBeCloseTo(5.2, 5);
    expect(result.durationMin).toBeCloseTo(12, 5);
    // The decoded geometry is 2 points (from the canonical example).
    // We just need to know the OSRM path was taken (>=2 points).
    expect(result.coordinates.length).toBeGreaterThanOrEqual(2);
  });

  test('falls back to straight-line polyline when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;

    const result = await fetchRoute(TASHKENT, SAMARKAND);

    expect(result.isFallback).toBe(true);
    // Two-point straight line covers the same endpoints.
    expect(result.coordinates).toHaveLength(2);
    expect(result.coordinates[0]).toEqual(TASHKENT);
    expect(result.coordinates[1]).toEqual(SAMARKAND);
    // Tashkent↔Samarkand great-circle is ~268 km. We're tolerant by
    // ±20 km to avoid pinning the haversine impl.
    expect(result.distanceKm).toBeGreaterThan(240);
    expect(result.distanceKm).toBeLessThan(290);
    // 30 km/h baseline → ~530-580 min. The exact number doesn't
    // matter, but it has to scale with distance.
    expect(result.durationMin).toBeGreaterThan(0);
  });

  test('falls back when OSRM returns a non-OK code (no route found)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 'NoRoute' }),
    }) as unknown as typeof fetch;

    const result = await fetchRoute(TASHKENT, SAMARKAND);
    expect(result.isFallback).toBe(true);
  });

  test('falls back to straight line for the (0, 0) destination sentinel', async () => {
    // Some clubs come back from the BE with lat/lng = 0/0 when the
    // operator hasn't set their location yet. We must NOT route to
    // the equator off the African coast — a fallback line from the
    // user to the user (0-distance) is the safe default.
    const ZERO = { latitude: 0, longitude: 0 };
    const spy = jest
      .spyOn(global, 'fetch' as never)
      .mockResolvedValue({ ok: true, json: async () => ({ code: 'Ok' }) } as never);

    const result = await fetchRoute(TASHKENT, ZERO);

    expect(result.isFallback).toBe(true);
    // The guard happens BEFORE we hit the network — no fetch call.
    expect(spy).not.toHaveBeenCalled();
  });

  test('falls back on HTTP error (5xx from OSRM)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const result = await fetchRoute(TASHKENT, SAMARKAND);
    expect(result.isFallback).toBe(true);
  });
});
