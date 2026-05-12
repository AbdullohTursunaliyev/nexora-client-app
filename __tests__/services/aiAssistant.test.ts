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
import * as ai from '../../lib/api/services/aiAssistant';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedPost = apiPost as jest.MockedFunction<typeof apiPost>;

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe('aiAssistant service', () => {
  test('getTips hits /mobile/ai/tips', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await ai.getTips();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/ai/tips');
  });

  test('getRecommendations hits /mobile/ai/recommendations', async () => {
    mockedGet.mockResolvedValueOnce({ data: { clubs: [], zones: [], times: [] } });
    await ai.getRecommendations();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/ai/recommendations');
  });

  test('listChat hits /mobile/ai/chat', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await ai.listChat();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/ai/chat');
  });

  test('sendChat posts text payload', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { id: 1, role: 'assistant', text: 'ok', created_at: '' },
    });
    await ai.sendChat('hello');
    expect(mockedPost).toHaveBeenCalledWith('/mobile/ai/chat', { text: 'hello' });
  });
});
