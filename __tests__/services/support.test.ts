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
import * as support from '../../lib/api/services/support';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedPost = apiPost as jest.MockedFunction<typeof apiPost>;

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe('support service', () => {
  test('callStaff posts message', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await support.callStaff('water please');
    expect(mockedPost).toHaveBeenCalledWith('/mobile/services/call-staff', {
      message: 'water please',
    });
  });

  test('callStaff with no message still posts envelope', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await support.callStaff();
    expect(mockedPost).toHaveBeenCalledWith('/mobile/services/call-staff', {
      message: undefined,
    });
  });

  test('reportIssue posts type and message', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await support.reportIssue({ type: 'tech', message: 'mouse broken' });
    expect(mockedPost).toHaveBeenCalledWith('/mobile/services/report', {
      type: 'tech',
      message: 'mouse broken',
    });
  });

  test('listHelpTopics hits /mobile/help/topics', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await support.listHelpTopics();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/help/topics');
  });

  test('submitSupportTicket posts subject + message', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true, ticket_id: 7 } });
    const out = await support.submitSupportTicket({ subject: 'X', message: 'Y' });
    expect(mockedPost).toHaveBeenCalledWith('/mobile/help/tickets', { subject: 'X', message: 'Y' });
    expect(out.ticket_id).toBe(7);
  });
});
