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
import * as discover from '../../lib/api/services/discover';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;

beforeEach(() => {
  mockedGet.mockReset();
});

describe('discover service', () => {
  test('listNearby without params uses bare URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await discover.listNearby();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/discover/clubs');
  });

  test('listNearby builds query string from filters', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await discover.listNearby({
      lat: 41.31,
      lng: 69.24,
      city: 'Tashkent',
      rating_min: 4,
      distance_max_km: 5,
    });
    expect(mockedGet).toHaveBeenCalledWith(
      '/mobile/discover/clubs?lat=41.31&lng=69.24&city=Tashkent&rating_min=4&distance_max_km=5',
    );
  });

  test('listNearby skips zero/empty values cleanly', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await discover.listNearby({ city: 'Samarkand' });
    expect(mockedGet).toHaveBeenCalledWith('/mobile/discover/clubs?city=Samarkand');
  });
});
