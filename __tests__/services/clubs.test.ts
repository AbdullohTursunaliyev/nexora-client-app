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
  test('joinByCode posts code', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true, tenant_id: 1 } });
    await clubs.joinByCode('ABC123');
    expect(mockedPost).toHaveBeenCalledWith('/mobile/club/join', { code: 'ABC123' });
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
