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
import * as clientSvc from '../../lib/api/services/client';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedPost = apiPost as jest.MockedFunction<typeof apiPost>;

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe('client service', () => {
  test('getSummary hits /mobile/client/summary', async () => {
    mockedGet.mockResolvedValueOnce({ data: { client: { id: 1 } } });
    await clientSvc.getSummary();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/client/summary');
  });

  test('claimMission targets the mission code in path', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true, reward: 100 } });
    await clientSvc.claimMission('topup_100k');
    expect(mockedPost).toHaveBeenCalledWith('/mobile/client/missions/topup_100k/claim');
  });
});
