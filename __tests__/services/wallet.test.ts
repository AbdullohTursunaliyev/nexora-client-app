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

  test('getPaymentMethods returns the ordered methods array', async () => {
    mockedGet.mockResolvedValueOnce({ data: { methods: ['payme', 'click'] } });

    const out = await wallet.getPaymentMethods();

    expect(mockedGet).toHaveBeenCalledWith('/client-auth/payment-methods');
    expect(out).toEqual(['payme', 'click']);
  });

  test('getPaymentMethods returns [] when the club configured none', async () => {
    mockedGet.mockResolvedValueOnce({ data: { methods: [] } });

    const out = await wallet.getPaymentMethods();

    expect(mockedGet).toHaveBeenCalledWith('/client-auth/payment-methods');
    expect(out).toEqual([]);
  });

  test('getPaymentMethods degrades to [] on a malformed body', async () => {
    // BE never SHOULD send this, but a missing `methods` key must not
    // crash the screen on `.map` — guard mirrors listCards/listTransactions.
    mockedGet.mockResolvedValueOnce({ data: {} });

    const out = await wallet.getPaymentMethods();

    expect(out).toEqual([]);
  });

  test('createTopupOrder posts amount + provider and maps snake_case', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        order_id: 'ord_42',
        provider: 'click',
        amount: 50000,
        checkout_url: 'https://my.click.uz/checkout/ord_42',
        status: 'pending',
      },
    });

    const out = await wallet.createTopupOrder(50000, 'click');

    expect(mockedPost).toHaveBeenCalledWith('/client-auth/topup', {
      amount: 50000,
      provider: 'click',
    });
    expect(out).toEqual({
      orderId: 'ord_42',
      provider: 'click',
      amount: 50000,
      checkoutUrl: 'https://my.click.uz/checkout/ord_42',
      status: 'pending',
    });
  });

  test('getTopupStatus hits the order URL and maps snake_case', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        order_id: 'ord_42',
        status: 'paid',
        paid: true,
        provider: 'payme',
        amount: 20000,
      },
    });

    const out = await wallet.getTopupStatus('ord_42');

    expect(mockedGet).toHaveBeenCalledWith('/client-auth/topup/ord_42');
    expect(out).toEqual({
      orderId: 'ord_42',
      status: 'paid',
      paid: true,
      provider: 'payme',
      amount: 20000,
    });
  });
});
