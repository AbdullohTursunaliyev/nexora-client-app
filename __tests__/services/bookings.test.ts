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

import { apiGet, apiDelete } from '../../lib/api/client';
import * as bookings from '../../lib/api/services/bookings';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedDelete = apiDelete as jest.MockedFunction<typeof apiDelete>;

beforeEach(() => {
  mockedGet.mockReset();
  mockedDelete.mockReset();
});

describe('bookings service', () => {
  test('listUpcoming hits /mobile/bookings/upcoming and returns items', async () => {
    mockedGet.mockResolvedValueOnce({ data: { items: [{ id: 1 }] } });

    const out = await bookings.listUpcoming();

    expect(mockedGet).toHaveBeenCalledWith('/mobile/bookings/upcoming');
    expect(out).toEqual([{ id: 1 }]);
  });

  test('listUpcoming defaults to empty array when items missing', async () => {
    mockedGet.mockResolvedValueOnce({ data: undefined });

    const out = await bookings.listUpcoming();

    expect(out).toEqual([]);
  });

  test('listHistory hits /mobile/bookings/history', async () => {
    mockedGet.mockResolvedValueOnce({ data: { items: [] } });

    await bookings.listHistory();

    expect(mockedGet).toHaveBeenCalledWith('/mobile/bookings/history');
  });

  test('cancelBooking sends DELETE with the id', async () => {
    mockedDelete.mockResolvedValueOnce({ data: { ok: true } });

    const out = await bookings.cancelBooking(42);

    expect(mockedDelete).toHaveBeenCalledWith('/mobile/bookings/42');
    expect(out.ok).toBe(true);
  });
});
