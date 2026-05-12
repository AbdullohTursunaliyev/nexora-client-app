jest.mock('../../lib/api/client', () => {
  const tokens = {
    setMobileToken: jest.fn(),
    setClientToken: jest.fn(),
    clear: jest.fn(),
    getMobileToken: jest.fn(),
    getClientToken: jest.fn(),
  };
  return {
    apiGet: jest.fn(),
    apiPost: jest.fn(),
    apiDelete: jest.fn(),
    tokens,
    getErrorMessage: (e: unknown) => String(e),
  };
});

import { apiGet, apiPost, tokens } from '../../lib/api/client';
import * as auth from '../../lib/api/services/auth';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedPost = apiPost as jest.MockedFunction<typeof apiPost>;

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  (tokens.setMobileToken as jest.Mock).mockReset();
  (tokens.setClientToken as jest.Mock).mockReset();
  (tokens.clear as jest.Mock).mockReset();
});

describe('auth service', () => {
  test('register hits /mobile/auth/register and persists mobile token', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { token: 't-1', user: { id: 1, login: 'a' }, clubs: [] },
    });

    const out = await auth.register({
      login: 'a',
      password: 'pw',
      password_confirmation: 'pw',
    } as any);

    expect(mockedPost).toHaveBeenCalledWith('/mobile/auth/register', {
      login: 'a',
      password: 'pw',
      password_confirmation: 'pw',
    });
    expect(tokens.setMobileToken).toHaveBeenCalledWith('t-1');
    expect(out.token).toBe('t-1');
  });

  test('login hits /mobile/auth/login and persists mobile token', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { token: 't-2', user: { id: 7, login: 'b' }, clubs: [] },
    });

    await auth.login({ login: 'b', password: 'pw' } as any);

    expect(mockedPost).toHaveBeenCalledWith('/mobile/auth/login', {
      login: 'b',
      password: 'pw',
    });
    expect(tokens.setMobileToken).toHaveBeenCalledWith('t-2');
  });

  test('me hits /mobile/auth/me and unwraps payload', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { user: { id: 9, login: 'me' }, clubs: [] },
    });

    const out = await auth.me();

    expect(mockedGet).toHaveBeenCalledWith('/mobile/auth/me');
    expect(out.user.id).toBe(9);
  });

  test('saveProfile sends body to /mobile/auth/profile', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { ok: true, user: { id: 1, login: 'u', first_name: 'A' } },
    });

    const out = await auth.saveProfile({ first_name: 'A' } as any);

    expect(mockedPost).toHaveBeenCalledWith('/mobile/auth/profile', { first_name: 'A' });
    expect(out.ok).toBe(true);
  });

  test('switchClub persists club token under client_token storage', async () => {
    // BE wire format is `club_token` (see MobileAuthService::switchClub).
    // Pre-fix the service mistakenly read `client_token`, this test
    // mocked the same wrong shape, and so the bug shipped while the
    // suite stayed green. Mirror the real response now.
    mockedPost.mockResolvedValueOnce({
      data: {
        club_token: 'ct-1',
        tenant: { id: 5, name: 'Demo Club' },
        client: { id: 9, balance: 0, bonus: 0 },
      },
    });

    await auth.switchClub(5);

    expect(mockedPost).toHaveBeenCalledWith('/mobile/auth/switch-club', { tenant_id: 5 });
    expect(tokens.setClientToken).toHaveBeenCalledWith('ct-1');
  });

  test('logout clears tokens even when network fails', async () => {
    mockedPost.mockRejectedValueOnce(new Error('offline'));

    await auth.logout();

    expect(mockedPost).toHaveBeenCalledWith('/mobile/auth/logout');
    expect(tokens.clear).toHaveBeenCalled();
  });
});
