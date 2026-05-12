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
import * as leaderboard from '../../lib/api/services/leaderboard';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;

beforeEach(() => {
  mockedGet.mockReset();
});

describe('leaderboard service', () => {
  test('getLeaderboard without params uses bare URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: { game: 'CS2', season: 5, scope: 'global', top: [] } });
    await leaderboard.getLeaderboard();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/leaderboard');
  });

  test('getLeaderboard appends all provided params', async () => {
    mockedGet.mockResolvedValueOnce({ data: { game: 'CS2', season: 5, scope: 'friends', top: [] } });
    await leaderboard.getLeaderboard({ game: 'CS2', scope: 'friends', season: 5, limit: 25 });
    expect(mockedGet).toHaveBeenCalledWith(
      '/mobile/leaderboard?game=CS2&scope=friends&season=5&limit=25',
    );
  });
});
