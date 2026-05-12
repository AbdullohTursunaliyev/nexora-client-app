/**
 * Helper: typed accessors for the mocked lib/api/client.
 *
 * Each test file must call `jest.mock('@/lib/api/client')` (or the relative
 * path) at the top so jest hoists the mock before module evaluation. Then it
 * imports `getMockedClient()` here to get strongly-typed jest.Mock references
 * to apiGet/apiPost/apiDelete and the tokens singleton.
 */
import type { MockedFunction } from 'jest-mock';

import * as client from '../../lib/api/client';

export interface MockedClient {
  apiGet: MockedFunction<typeof client.apiGet>;
  apiPost: MockedFunction<typeof client.apiPost>;
  apiDelete: MockedFunction<typeof client.apiDelete>;
  tokens: {
    setMobileToken: jest.Mock;
    setClientToken: jest.Mock;
    clear: jest.Mock;
    getMobileToken: jest.Mock;
    getClientToken: jest.Mock;
  };
}

export function getMockedClient(): MockedClient {
  return {
    apiGet: client.apiGet as unknown as MockedFunction<typeof client.apiGet>,
    apiPost: client.apiPost as unknown as MockedFunction<typeof client.apiPost>,
    apiDelete: client.apiDelete as unknown as MockedFunction<typeof client.apiDelete>,
    tokens: client.tokens as unknown as MockedClient['tokens'],
  };
}

export function resetClientMock(): void {
  const m = getMockedClient();
  m.apiGet.mockReset();
  m.apiPost.mockReset();
  m.apiDelete.mockReset();
  m.tokens.setMobileToken.mockReset?.();
  m.tokens.setClientToken.mockReset?.();
  m.tokens.clear.mockReset?.();
  m.tokens.getMobileToken.mockReset?.();
  m.tokens.getClientToken.mockReset?.();
}
