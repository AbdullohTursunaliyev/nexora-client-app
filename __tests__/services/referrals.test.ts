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
import * as referrals from '../../lib/api/services/referrals';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;

beforeEach(() => {
  mockedGet.mockReset();
});

describe('referrals service', () => {
  test('getReferralInfo returns unwrapped payload', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        code: 'NEX1',
        invite_url: 'https://x',
        total_invites: 3,
        active_friends: 2,
        points_earned: 700,
        milestones: [],
      },
    });

    const out = await referrals.getReferralInfo();

    expect(mockedGet).toHaveBeenCalledWith('/mobile/client/referrals');
    expect(out.code).toBe('NEX1');
    expect(out.points_earned).toBe(700);
  });
});
