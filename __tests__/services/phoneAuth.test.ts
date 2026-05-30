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

import { apiPost, tokens } from '../../lib/api/client';
import * as phoneAuth from '../../lib/api/services/phoneAuth';

const mockedPost = apiPost as jest.MockedFunction<typeof apiPost>;

beforeEach(() => {
  mockedPost.mockReset();
  (tokens.setMobileToken as jest.Mock).mockReset();
  (tokens.setClientToken as jest.Mock).mockReset();
  (tokens.clear as jest.Mock).mockReset();
});

describe('phoneAuth service', () => {
  test('requestCode posts to /mobile/auth/phone/request-code with phone', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        phone: '998901234567',
        expires_at: '2026-01-01T00:00:00Z',
        ttl_seconds: 300,
        dev_code: '4892',
      },
    });

    const out = await phoneAuth.requestCode('+998 90 123-45-67');

    expect(mockedPost).toHaveBeenCalledWith('/mobile/auth/phone/request-code', {
      phone: '+998 90 123-45-67',
    });
    expect(out.dev_code).toBe('4892');
    // requestCode must NOT touch tokens — the user hasn't been
    // authenticated yet at this step. Pre-test regression: an earlier
    // draft called setMobileToken with the dev_code value (mistaking
    // the OTP for a session token), which leaked the OTP into the
    // keychain alongside the real token on the next verify.
    expect(tokens.setMobileToken).not.toHaveBeenCalled();
  });

  test('verifyCode persists mobile token on login outcome', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        token: 'mt-login-1',
        user: { id: 42, login: '998901234567', phone: '998901234567' },
        clubs: [{ tenant_id: 5, tenant_name: 'Nexora' }],
      },
    });

    const out = await phoneAuth.verifyCode('998901234567', '4892');

    expect(mockedPost).toHaveBeenCalledWith('/mobile/auth/phone/verify-code', {
      phone: '998901234567',
      code: '4892',
    });
    expect(tokens.setMobileToken).toHaveBeenCalledWith('mt-login-1');
    expect(phoneAuth.needsRegistration(out)).toBe(false);
  });

  test('verifyCode skips token persistence on needs_registration outcome', async () => {
    // When the phone is brand-new the BE returns a signup_token, not
    // a session token. The service must not touch the keystore — the
    // FE routes the user to the registration screen instead.
    mockedPost.mockResolvedValueOnce({
      data: {
        needs_registration: true,
        signup_token: 'enc-abc',
        phone: '998901234567',
      },
    });

    const out = await phoneAuth.verifyCode('998901234567', '4892');

    expect(phoneAuth.needsRegistration(out)).toBe(true);
    expect(tokens.setMobileToken).not.toHaveBeenCalled();
  });

  test('register persists mobile token and forwards name fields', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        token: 'mt-fresh-1',
        user: { id: 43, login: '998901234567', phone: '998901234567' },
        clubs: [],
      },
    });

    await phoneAuth.register('enc-abc', 'Akmal', 'Karimov');

    expect(mockedPost).toHaveBeenCalledWith('/mobile/auth/phone/register', {
      signup_token: 'enc-abc',
      first_name: 'Akmal',
      last_name: 'Karimov',
      referral_code: null,
      birth_date: null,
    });
    expect(tokens.setMobileToken).toHaveBeenCalledWith('mt-fresh-1');
  });

  test('register accepts null name fields (operator-onboarded user keeps unnamed account)', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        token: 'mt-anon-1',
        user: { id: 44, login: '998901234567' },
        clubs: [],
      },
    });

    await phoneAuth.register('enc-xyz');

    expect(mockedPost).toHaveBeenCalledWith('/mobile/auth/phone/register', {
      signup_token: 'enc-xyz',
      first_name: null,
      last_name: null,
      referral_code: null,
      birth_date: null,
    });
  });
});
