/**
 * Tests for the response-shape normalization in lib/api/client.ts.
 *
 * Backend `MobilePayloadResource` ($wrap=null) returns the raw payload at the
 * top level (e.g. `{user, clubs}`), but every service in the app reads
 * `res.data.X`. The client wraps unwrapped bodies in `{data: ...}` so callers
 * get a consistent shape regardless of whether a given endpoint wrapped or
 * not. These tests pin that contract.
 */

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockUse = jest.fn();
const fakeInstance = {
  get: mockGet,
  post: mockPost,
  delete: mockDelete,
  interceptors: {
    request: { use: mockUse },
    response: { use: mockUse },
  },
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => fakeInstance),
    isAxiosError: () => false,
  },
  isAxiosError: () => false,
}));

import { apiDelete, apiGet, apiPost } from '../lib/api/client';

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockDelete.mockReset();
});

describe('client wrapEnvelope behavior', () => {
  test('apiGet wraps unwrapped backend payload in { data }', async () => {
    mockGet.mockResolvedValueOnce({
      data: { user: { id: 1, login: 'alice' }, clubs: [] },
    });

    const res = await apiGet<{ data: { user: { id: number; login: string } } }>('/mobile/auth/me');

    expect(mockGet).toHaveBeenCalledWith('/mobile/auth/me', undefined);
    expect(res.data.user.id).toBe(1);
    expect(res.data.user.login).toBe('alice');
  });

  test('apiGet passes through already-wrapped payload unchanged', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: { foo: 'bar' } } });

    const res = await apiGet<{ data: { foo: string } }>('/legacy/wrapped');

    expect(res.data.foo).toBe('bar');
  });

  test('apiPost wraps body and forwards request body', async () => {
    mockPost.mockResolvedValueOnce({ data: { ok: true, ticket_id: 7 } });

    const res = await apiPost<{ data: { ok: boolean; ticket_id: number } }>(
      '/mobile/help/tickets',
      { subject: 'X', message: 'Y' },
    );

    expect(mockPost).toHaveBeenCalledWith(
      '/mobile/help/tickets',
      { subject: 'X', message: 'Y' },
      undefined,
    );
    expect(res.data.ok).toBe(true);
    expect(res.data.ticket_id).toBe(7);
  });

  test('apiDelete wraps response and forwards delete', async () => {
    mockDelete.mockResolvedValueOnce({ data: { ok: true } });

    const res = await apiDelete<{ data: { ok: boolean } }>('/mobile/bookings/42');

    expect(mockDelete).toHaveBeenCalledWith('/mobile/bookings/42', undefined);
    expect(res.data.ok).toBe(true);
  });

  test('apiGet wraps array payloads (e.g. tournaments list)', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] });

    const res = await apiGet<{ data: { id: number }[] }>('/mobile/tournaments');

    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data).toHaveLength(2);
  });

  test('apiGet passes through paginated responses (data + meta)', async () => {
    mockGet.mockResolvedValueOnce({
      data: { data: [{ id: 1 }], meta: { total: 1, current_page: 1, per_page: 20 } },
    });

    const res = await apiGet<{ data: { id: number }[]; meta: { total: number } }>('/legacy/list');

    expect(res.data).toEqual([{ id: 1 }]);
    expect((res as any).meta.total).toBe(1);
  });

  test('apiGet throws when body has error shape with status:error', async () => {
    mockGet.mockResolvedValueOnce({
      data: { status: 'error', message: 'Backend on fire' },
    });

    await expect(apiGet('/some/url')).rejects.toThrow(/Backend on fire/);
  });

  test('apiGet throws when body has top-level error string', async () => {
    mockGet.mockResolvedValueOnce({
      data: { error: 'Validation failed' },
    });

    await expect(apiGet('/some/url')).rejects.toThrow(/Validation failed/);
  });

  test('apiGet does NOT throw on { ok: false } domain responses', async () => {
    // ok:false is a legitimate "no-op" signal in our own endpoints
    // (e.g. markRead returning ok:false when nothing was updated). The
    // guard explicitly allows it through.
    mockGet.mockResolvedValueOnce({
      data: { ok: false, updated: 0 },
    });

    const res = await apiGet<{ data: { ok: boolean; updated: number } }>('/markRead');

    expect(res.data.ok).toBe(false);
    expect(res.data.updated).toBe(0);
  });
});
