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
import * as promos from '../../lib/api/services/promotions';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;

beforeEach(() => {
  mockedGet.mockReset();
});

/**
 * Coverage gap closed by audit M3 — every other `lib/api/services/*`
 * module ships with a test of the same shape (assert URL + payload
 * unwrap). promotions was the one that didn't, and that's exactly the
 * file class where past audits caught FE/BE shape drift (qr_code,
 * zone_id, zone_key, staff_rating). The cheap shape-assertion below
 * is what would have caught H1 earlier on the review side.
 */
describe('promotions service', () => {
  test('listPromotions calls the BE-scoped /mobile/promotions endpoint', async () => {
    mockedGet.mockResolvedValueOnce({
      data: [
        {
          id: '1',
          title: 'Double topup',
          description: 'Topup 100k, get 200k credit',
          type: 'double_topup',
          bonus_percent: 100,
          code: 'NEW100',
          starts_at: '2026-01-01T00:00:00Z',
          ends_at: '2026-01-31T23:59:59Z',
          priority: 1,
        },
      ],
    });
    const out = await promos.listPromotions();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/promotions');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('1');
    expect(out[0].type).toBe('double_topup');
    expect(out[0].bonus_percent).toBe(100);
  });

  test('listPromotions surfaces an empty list when BE returns []', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    const out = await promos.listPromotions();
    expect(out).toEqual([]);
  });

  test('listPromotions passes through nullable fields verbatim', async () => {
    // BE allows `bonus_percent: null` (promo isn't a topup multiplier)
    // and `code: null` (auto-applied promo, no code to show). Verify
    // the type permits both — the FE renders them as "—" downstream.
    mockedGet.mockResolvedValueOnce({
      data: [
        {
          id: '2',
          title: 'Birthday bonus',
          description: 'Free hour on your birthday',
          type: 'birthday',
          bonus_percent: null,
          code: null,
          starts_at: null,
          ends_at: null,
          priority: 5,
        },
      ],
    });
    const out = await promos.listPromotions();
    expect(out[0].bonus_percent).toBeNull();
    expect(out[0].code).toBeNull();
  });
});
