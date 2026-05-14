jest.mock('../../lib/api/client', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiDelete: jest.fn(),
  tokens: {
    setMobileToken: jest.fn(),
    setClientToken: jest.fn(),
    clear: jest.fn(),
    getMobileToken: jest.fn(),
    getClientToken: jest.fn(),
  },
}));

import { apiGet } from '../../lib/api/client';
import * as packagesApi from '../../lib/api/services/packages';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;

beforeEach(() => {
  mockedGet.mockReset();
});

/**
 * Coverage gap closed by audit M3 — packages.ts was the second
 * service module shipping without tests. The shape-assertions below
 * are what would catch the next FE/BE drift on the booking flow
 * (e.g. if the BE rename `duration_min` → `duration_minutes` or
 * the slot endpoint changes its `?date=...` contract).
 */
describe('packages service', () => {
  describe('listPackages', () => {
    test('unwraps the packages array from {packages: [...]}', async () => {
      mockedGet.mockResolvedValueOnce({
        data: {
          packages: [
            {
              id: 1,
              name: '3 soat',
              description: 'Klassik paket',
              duration_min: 180,
              bonus_minutes: 0,
              validity_days: 30,
              price: 60000,
              zone: 'PC',
            },
          ],
        },
      });
      const out = await packagesApi.listPackages();
      expect(mockedGet).toHaveBeenCalledWith('/mobile/packages');
      expect(out).toHaveLength(1);
      expect(out[0].duration_min).toBe(180);
      expect(out[0].zone).toBe('PC');
    });

    test('returns empty array when BE response has no packages field', async () => {
      mockedGet.mockResolvedValueOnce({ data: {} });
      const out = await packagesApi.listPackages();
      expect(out).toEqual([]);
    });
  });

  describe('listBookingSlots', () => {
    test('calls bare URL when no params', async () => {
      mockedGet.mockResolvedValueOnce({
        data: { date: '2026-05-14', duration_min: 60, slots: [], has_slots: false },
      });
      await packagesApi.listBookingSlots();
      expect(mockedGet).toHaveBeenCalledWith('/mobile/booking/slots');
    });

    test('appends duration_min + date + zone_id query params', async () => {
      mockedGet.mockResolvedValueOnce({
        data: { date: '2026-05-15', duration_min: 180, slots: [], has_slots: false },
      });
      await packagesApi.listBookingSlots({
        date: '2026-05-15',
        durationMin: 180,
        zoneId: 42,
      });
      expect(mockedGet).toHaveBeenCalledWith(
        expect.stringMatching(
          /\/mobile\/booking\/slots\?.*date=2026-05-15.*duration_min=180.*zone_id=42/,
        ),
      );
    });

    test('omits zone_id when null (no zone resolved yet)', async () => {
      // The booking flow calls this from time-select with
      // zoneId: beZoneId ?? null. The URL should NOT include
      // `zone_id=` when null; otherwise the BE would receive the
      // string "null" and silently fail the integer-only filter.
      mockedGet.mockResolvedValueOnce({
        data: { date: '2026-05-14', duration_min: 60, slots: [], has_slots: false },
      });
      await packagesApi.listBookingSlots({ durationMin: 60, zoneId: null });
      const url = mockedGet.mock.calls[0][0];
      expect(url).not.toContain('zone_id=');
    });

    test('forwards the date + slots payload verbatim', async () => {
      mockedGet.mockResolvedValueOnce({
        data: {
          date: '2026-05-14',
          duration_min: 60,
          has_slots: true,
          slots: [
            { time: '10:00', hour: 10, is_peak: false, window: null },
            {
              time: '20:00',
              hour: 20,
              is_peak: true,
              window: { id: 5, name: 'Peak evenings', price_per_hour: 25000 },
            },
          ],
        },
      });
      const out = await packagesApi.listBookingSlots({ durationMin: 60 });
      expect(out.date).toBe('2026-05-14');
      expect(out.has_slots).toBe(true);
      expect(out.slots).toHaveLength(2);
      expect(out.slots[1].is_peak).toBe(true);
      expect(out.slots[1].window?.price_per_hour).toBe(25000);
    });
  });
});
