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
import * as tournaments from '../../lib/api/services/tournaments';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedPost = apiPost as jest.MockedFunction<typeof apiPost>;

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe('tournaments service', () => {
  test('listTournaments without params uses bare URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await tournaments.listTournaments();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/tournaments');
  });

  test('listTournaments builds game + status query', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await tournaments.listTournaments({ game: 'cs2', status: 'live' });
    expect(mockedGet).toHaveBeenCalledWith('/mobile/tournaments?game=cs2&status=live');
  });

  test('listTournaments drops "all" status sentinel', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await tournaments.listTournaments({ game: 'cs2', status: 'all' });
    expect(mockedGet).toHaveBeenCalledWith('/mobile/tournaments?game=cs2');
  });

  test('getTournament hits /mobile/tournaments/{id}', async () => {
    mockedGet.mockResolvedValueOnce({ data: { id: 1, name: 'X' } });
    const out = await tournaments.getTournament(1);
    expect(mockedGet).toHaveBeenCalledWith('/mobile/tournaments/1');
    expect(out.name).toBe('X');
  });

  test('registerForTournament passes empty body when no team_id', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await tournaments.registerForTournament(5);
    expect(mockedPost).toHaveBeenCalledWith('/mobile/tournaments/5/register', {});
  });

  test('registerForTournament passes team_id when provided', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await tournaments.registerForTournament(5, 42);
    expect(mockedPost).toHaveBeenCalledWith('/mobile/tournaments/5/register', { team_id: 42 });
  });
});
