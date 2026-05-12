/**
 * Tests for the URL-resolution guard in lib/api/config.ts.
 *
 * The guard is the only thing standing between a dev mistake and a release
 * build that ships plaintext-HTTP API traffic. We can't easily mock
 * `__DEV__` in jest (it's a global injected by the React Native bundler),
 * so we exercise the resolver via re-imports with manipulated env.
 */

const ORIGINAL_DEV = (global as any).__DEV__;
const ORIGINAL_URL = process.env.EXPO_PUBLIC_API_URL;

afterEach(() => {
  (global as any).__DEV__ = ORIGINAL_DEV;
  if (ORIGINAL_URL == null) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = ORIGINAL_URL;
  }
  jest.resetModules();
});

describe('API_BASE_URL resolution', () => {
  test('uses EXPO_PUBLIC_API_URL when set in dev', async () => {
    (global as any).__DEV__ = true;
    process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.5:8080/api';

    jest.resetModules();
    const { API_BASE_URL } = await import('../lib/api/config');

    expect(API_BASE_URL).toBe('http://192.168.1.5:8080/api');
  });

  test('falls back to localhost in dev when env is missing', async () => {
    (global as any).__DEV__ = true;
    delete process.env.EXPO_PUBLIC_API_URL;

    jest.resetModules();
    const { API_BASE_URL } = await import('../lib/api/config');

    expect(API_BASE_URL).toBe('http://localhost:8080/api');
  });

  test('throws in production if env is missing', async () => {
    (global as any).__DEV__ = false;
    delete process.env.EXPO_PUBLIC_API_URL;

    jest.resetModules();
    await expect(import('../lib/api/config')).rejects.toThrow(/required in production/);
  });

  test('throws in production if URL is plain HTTP', async () => {
    (global as any).__DEV__ = false;
    process.env.EXPO_PUBLIC_API_URL = 'http://api.example.com/api';

    jest.resetModules();
    await expect(import('../lib/api/config')).rejects.toThrow(/must use https/);
  });

  test('accepts https in production', async () => {
    (global as any).__DEV__ = false;
    process.env.EXPO_PUBLIC_API_URL = 'https://api.nexora.uz/api';

    jest.resetModules();
    const { API_BASE_URL } = await import('../lib/api/config');

    expect(API_BASE_URL).toBe('https://api.nexora.uz/api');
  });
});
