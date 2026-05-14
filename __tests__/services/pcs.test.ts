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
  // `pcs.ts` subscribes to the auth bus on module load (clears the
  // listPcs cache on `auth:unauthorized`). The real export is a class
  // instance with an `.on` method — the test mock has to mirror that
  // shape or import of the service throws.
  authEvents: {
    on: jest.fn(),
    emit: jest.fn(),
  },
}));

import { apiGet, apiPost, apiDelete } from '../../lib/api/client';
import * as pcs from '../../lib/api/services/pcs';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedPost = apiPost as jest.MockedFunction<typeof apiPost>;
const mockedDelete = apiDelete as jest.MockedFunction<typeof apiDelete>;

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedDelete.mockReset();
  // `listPcs()` uses a 30s module-level cache to dedupe the booking
  // flow's triple fetch. Tests run faster than the TTL, so each case
  // needs an explicit reset or the previous case's mocked response
  // leaks in via cache.
  pcs.invalidatePcsCache();
});

describe('pcs service', () => {
  test('listPcs unwraps pcs array', async () => {
    mockedGet.mockResolvedValueOnce({ data: { pcs: [{ id: 1 }] } });
    const out = await pcs.listPcs();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/pcs');
    expect(out).toEqual([{ id: 1 }]);
  });

  test('listPcs returns empty array when pcs missing', async () => {
    mockedGet.mockResolvedValueOnce({ data: {} });
    const out = await pcs.listPcs();
    expect(out).toEqual([]);
  });

  test('bookPc posts hold_minutes payload', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await pcs.bookPc(7, { hold_minutes: 60 });
    expect(mockedPost).toHaveBeenCalledWith('/mobile/pcs/7/book', { hold_minutes: 60 });
  });

  test('bookPc with no body posts empty object', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await pcs.bookPc(7);
    expect(mockedPost).toHaveBeenCalledWith('/mobile/pcs/7/book', {});
  });

  test('partyBook posts pc_ids', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await pcs.partyBook({ pc_ids: [1, 2, 3] });
    expect(mockedPost).toHaveBeenCalledWith('/mobile/pcs/party-book', { pc_ids: [1, 2, 3] });
  });

  test('quickRebook calls rebook-quick', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await pcs.quickRebook();
    expect(mockedPost).toHaveBeenCalledWith('/mobile/pcs/rebook-quick');
  });

  test('smartSeat adapts BE {items} → FE {pc, alternatives}', async () => {
    // BE returns `{ok, meta, items: [...]}` — pre-fix the FE typed
    // it as `{pc, reasoning, alternatives}` so the screen crashed
    // with "cannot read property 'id' of undefined".
    mockedGet.mockResolvedValueOnce({
      data: {
        ok: true,
        meta: { arrive_in: 15, limit: 3 },
        items: [
          { pc_id: 42, pc_name: 'PC-42', zone_name: 'PRO', status: 'free' },
          { pc_id: 43, pc_name: 'PC-43', zone_name: 'VIP', status: 'free' },
        ],
      },
    });
    const out = await pcs.smartSeat();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/pcs/smart-seat');
    expect(out.pc?.id).toBe(42);
    expect(out.pc?.code).toBe('PC-42');
    expect(out.alternatives).toHaveLength(1);
    expect(out.alternatives[0].id).toBe(43);
    expect(out.meta?.arrive_in).toBe(15);
  });

  test('smartSeat returns null pc when BE has no items', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { ok: true, meta: {}, items: [] },
    });
    const out = await pcs.smartSeat();
    expect(out.pc).toBeNull();
    expect(out.alternatives).toEqual([]);
  });

  test('smartSeat passes through optional query params', async () => {
    mockedGet.mockResolvedValueOnce({ data: { ok: true, meta: {}, items: [] } });
    await pcs.smartSeat({ zoneKey: 'id:5', arriveIn: 30, limit: 5 });
    expect(mockedGet).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/mobile\/pcs\/smart-seat\?.*zone_key=id%3A5.*arrive_in=30.*limit=5/,
      ),
    );
  });

  test('smartSeatHold posts pc_id', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await pcs.smartSeatHold(7);
    expect(mockedPost).toHaveBeenCalledWith('/mobile/pcs/smart-seat/hold', { pc_id: 7 });
  });

  test('unbookPc sends DELETE on book route', async () => {
    mockedDelete.mockResolvedValueOnce({ data: { ok: true } });
    await pcs.unbookPc(7);
    expect(mockedDelete).toHaveBeenCalledWith('/mobile/pcs/7/book');
  });

  test('openByQr posts code only (BE looks up by tenant-scoped pcs.code)', async () => {
    // BE validator (MobileOpenQrRequest) requires `code` only — the
    // integer pc_id is resolved server-side via the (tenant_id, code)
    // UNIQUE index. Pre-fix the FE sent `{pc_id, code}` and tried to
    // guess pc_id by digit-extraction from labels like "PC-01", which
    // was wrong for every tenant whose db ids weren't lockstep with
    // its sticker numbering.
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await pcs.openByQr({ code: 'PC-01' });
    expect(mockedPost).toHaveBeenCalledWith('/mobile/pcs/open', {
      code: 'PC-01',
    });
  });

  test('listSmartQueue unwraps items', async () => {
    mockedGet.mockResolvedValueOnce({ data: { items: [{ id: 1, position: 1, status: 'waiting' }] } });
    const out = await pcs.listSmartQueue();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/client/smart-queue');
    expect(out).toHaveLength(1);
  });

  test('joinSmartQueue posts zone_key + notify_on_free (NOT zone_id)', async () => {
    // BE validator (MobileSmartQueueJoinRequest) expects `zone_key`
    // (string) + `notify_on_free` (boolean). Pre-fix the FE sent
    // `{zone_id: number}` and every join 422'd.
    mockedPost.mockResolvedValueOnce({ data: { id: 1, position: 1, status: 'waiting' } });
    await pcs.joinSmartQueue({ zoneKey: 'id:3', notifyOnFree: true });
    expect(mockedPost).toHaveBeenCalledWith('/mobile/client/smart-queue/join', {
      zone_key: 'id:3',
      notify_on_free: true,
    });
  });

  test('joinSmartQueue with no args defaults to zone_key=null, notify_on_free=true', async () => {
    mockedPost.mockResolvedValueOnce({ data: { id: 1, position: 1, status: 'waiting' } });
    await pcs.joinSmartQueue();
    expect(mockedPost).toHaveBeenCalledWith('/mobile/client/smart-queue/join', {
      zone_key: null,
      notify_on_free: true,
    });
  });

  test('cancelSmartQueue sends DELETE for an item', async () => {
    mockedDelete.mockResolvedValueOnce({ data: { ok: true } });
    await pcs.cancelSmartQueue(9);
    expect(mockedDelete).toHaveBeenCalledWith('/mobile/client/smart-queue/9');
  });

  describe('findMyPc', () => {
    // Helper for terse fixtures — only the fields findMyPc reads.
    const pc = (overrides: any) => ({ id: 1, code: 'PC-1', status: 'free', ...overrides });

    test('returns PC where booking.is_mine === true', () => {
      const list = [
        pc({ id: 1, status: 'booked', booking: { client_id: 10, is_mine: false } }),
        pc({ id: 2, status: 'busy', booking: { client_id: 99, is_mine: true } }),
        pc({ id: 3, status: 'free' }),
      ];
      const out = pcs.findMyPc(list as any, 99);
      expect(out?.id).toBe(2);
    });

    test('falls back to client_id match when is_mine flag is absent', () => {
      // Older BE build that returns the booking object without is_mine.
      const list = [
        pc({ id: 1, status: 'booked', booking: { client_id: 10 } }),
        pc({ id: 2, status: 'busy', booking: { client_id: 99 } }),
      ];
      const out = pcs.findMyPc(list as any, 99);
      expect(out?.id).toBe(2);
    });

    test('returns null when no PC is owned by the caller', () => {
      // Pre-fix this was the buggy path — old code returned the first
      // busy PC in the tenant regardless of ownership. Now we return
      // null so callers can render an empty/awaiting state instead.
      const list = [
        pc({ id: 1, status: 'busy', booking: { client_id: 10, is_mine: false } }),
        pc({ id: 2, status: 'free' }),
      ];
      const out = pcs.findMyPc(list as any, 99);
      expect(out).toBeNull();
    });

    test('returns null when caller has no clientId AND no is_mine flag matches', () => {
      const list = [
        pc({ id: 1, status: 'busy', booking: { client_id: 10 } }),
        pc({ id: 2, status: 'booked', booking: { client_id: 11 } }),
      ];
      const out = pcs.findMyPc(list as any, null);
      expect(out).toBeNull();
    });

    test('returns null on an empty PC list', () => {
      expect(pcs.findMyPc([], 99)).toBeNull();
    });
  });
});
