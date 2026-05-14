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
import * as clubs from '../../lib/api/services/clubs';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedPost = apiPost as jest.MockedFunction<typeof apiPost>;

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe('clubs service', () => {
  test('joinByCode posts code and password', async () => {
    // BE requires both `code` and `password` (min 8 chars). Pre-fix
    // this test only verified the code field, masking the bug where
    // the service forgot to send the password — every real join
    // call 422'd in production while this test passed locally.
    mockedPost.mockResolvedValueOnce({ data: { ok: true, tenant_id: 1 } });
    await clubs.joinByCode('ABC123', 'secret-password');
    expect(mockedPost).toHaveBeenCalledWith('/mobile/club/join', {
      code: 'ABC123',
      password: 'secret-password',
    });
  });

  test('previewClub uses tenant id in path', async () => {
    mockedGet.mockResolvedValueOnce({ data: { tenant_id: 5, name: 'X' } });
    await clubs.previewClub(5);
    expect(mockedGet).toHaveBeenCalledWith('/mobile/club/preview/5');
  });

  test('getClubProfile hits /mobile/club/profile', async () => {
    mockedGet.mockResolvedValueOnce({ data: { tenant_id: 1, name: 'X' } });
    await clubs.getClubProfile();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/club/profile');
  });

  test('getClubReviews hits /mobile/club/reviews', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await clubs.getClubReviews();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/club/reviews');
  });

  test('saveClubReview posts review body', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { id: 1, client_id: 1, rating: 5, created_at: '' },
    });
    await clubs.saveClubReview({ rating: 5, comment: 'great' });
    expect(mockedPost).toHaveBeenCalledWith('/mobile/club/reviews', {
      rating: 5,
      comment: 'great',
    });
  });
});
