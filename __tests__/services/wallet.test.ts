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
import * as wallet from '../../lib/api/services/wallet';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedPost = apiPost as jest.MockedFunction<typeof apiPost>;

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe('wallet service', () => {
  test('getBalance returns unwrapped payload', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        tenant_id: 1,
        tenant_name: 'X',
        balance: 1000,
        bonus_points: 50,
        cashback_total: 200,
        cashback_today_percent: 5,
      },
    });

    const out = await wallet.getBalance();

    expect(mockedGet).toHaveBeenCalledWith('/mobile/wallet/balance');
    expect(out.balance).toBe(1000);
  });

  test('listCards returns array', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });

    const out = await wallet.listCards();

    expect(mockedGet).toHaveBeenCalledWith('/mobile/wallet/cards');
    expect(out).toEqual([]);
  });

  test('listTransactions appends limit query', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await wallet.listTransactions(20);
    expect(mockedGet).toHaveBeenCalledWith('/mobile/wallet/transactions?limit=20');
  });

  test('listTransactions without limit uses bare URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await wallet.listTransactions();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/wallet/transactions');
  });

  test('topup posts amount + method', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true, transaction_id: 9 } });

    const out = await wallet.topup({ amount: 25000, method: 'payme' });

    expect(mockedPost).toHaveBeenCalledWith('/mobile/wallet/topup', {
      amount: 25000,
      method: 'payme',
    });
    expect(out.transaction_id).toBe(9);
  });
});
