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
import * as teams from '../../lib/api/services/teams';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedPost = apiPost as jest.MockedFunction<typeof apiPost>;

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe('teams service', () => {
  test('searchPlayers without params uses bare URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await teams.searchPlayers();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/teams/players');
  });

  test('searchPlayers passes game and mic filter', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await teams.searchPlayers({ game: 'cs2', micOnly: true });
    expect(mockedGet).toHaveBeenCalledWith('/mobile/teams/players?game=cs2&mic=1');
  });

  test('listTeams without game uses bare URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await teams.listTeams();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/teams');
  });

  test('listTeams with game appends ?game=', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await teams.listTeams('valorant');
    expect(mockedGet).toHaveBeenCalledWith('/mobile/teams?game=valorant');
  });

  test('createTeam posts name and game', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { id: 1, name: 'Squad', game: 'cs2' },
    });
    await teams.createTeam({ name: 'Squad', game: 'cs2' });
    expect(mockedPost).toHaveBeenCalledWith('/mobile/teams', { name: 'Squad', game: 'cs2' });
  });

  test('inviteToTeam targets nested route', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await teams.inviteToTeam(7, 42);
    expect(mockedPost).toHaveBeenCalledWith('/mobile/teams/7/invite', { user_id: 42 });
  });

  test('listMessages targets team messages endpoint', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await teams.listMessages(7);
    expect(mockedGet).toHaveBeenCalledWith('/mobile/teams/7/messages');
  });

  test('sendMessage posts text', async () => {
    mockedPost.mockResolvedValueOnce({ data: { id: 1, text: 'gg' } });
    await teams.sendMessage(7, 'gg');
    expect(mockedPost).toHaveBeenCalledWith('/mobile/teams/7/messages', { text: 'gg' });
  });

  test('reactToMessage posts emoji to nested react route', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await teams.reactToMessage(7, 11, 'fire');
    expect(mockedPost).toHaveBeenCalledWith('/mobile/teams/7/messages/11/react', { emoji: 'fire' });
  });
});
