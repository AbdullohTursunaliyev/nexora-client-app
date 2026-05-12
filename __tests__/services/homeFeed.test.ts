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
import * as homeFeed from '../../lib/api/services/homeFeed';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;

beforeEach(() => {
  mockedGet.mockReset();
});

describe('homeFeed service', () => {
  test('getFeed hits /mobile/home/feed and returns payload', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        greeting_name: 'Alice',
        level: 12,
        unread_notifications: 1,
        promotions: [],
        joined_clubs: [],
        all_clubs: [],
      },
    });

    const out = await homeFeed.getFeed();

    expect(mockedGet).toHaveBeenCalledWith('/mobile/home/feed');
    expect(out.greeting_name).toBe('Alice');
    expect(out.unread_notifications).toBe(1);
  });
});
