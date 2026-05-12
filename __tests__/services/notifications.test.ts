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

import { apiGet, apiPost } from '../../lib/api/client';
import * as notif from '../../lib/api/services/notifications';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedPost = apiPost as jest.MockedFunction<typeof apiPost>;

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe('notifications service', () => {
  test('listNotifications without category uses bare URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: { items: [], unread_count: 0 } });
    await notif.listNotifications();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/client/notifications');
  });

  test('listNotifications drops "all" sentinel', async () => {
    mockedGet.mockResolvedValueOnce({ data: { items: [], unread_count: 0 } });
    await notif.listNotifications('all');
    expect(mockedGet).toHaveBeenCalledWith('/mobile/client/notifications');
  });

  test('listNotifications passes category as query', async () => {
    mockedGet.mockResolvedValueOnce({ data: { items: [], unread_count: 0 } });
    await notif.listNotifications('bookings');
    expect(mockedGet).toHaveBeenCalledWith('/mobile/client/notifications?category=bookings');
  });

  test('markRead targets the specific id', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await notif.markRead(7);
    expect(mockedPost).toHaveBeenCalledWith('/mobile/client/notifications/7/read');
  });

  test('markAllRead hits read-all', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await notif.markAllRead();
    expect(mockedPost).toHaveBeenCalledWith('/mobile/client/notifications/read-all');
  });
});
