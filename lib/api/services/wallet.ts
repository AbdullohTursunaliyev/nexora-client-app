import { apiGet, apiPost } from '../client';
import type { ApiResource } from '../types';

/**
 * Top-up gateways the backend currently accepts. UZCARD/HUMO direct
 * card credit was removed in Day 1 #2 — those cards still exist as
 * saved-card metadata but the topup itself goes through a payment
 * gateway (Payme/Click) which then settles back into the wallet.
 *
 * Mirror in `MobileWalletController::topup()` validation rule:
 *   `'method' => ['required', 'string', 'in:payme,click']`
 */
export type PaymentMethod = 'payme' | 'click';

export interface WalletBalance {
  tenant_id: number;
  tenant_name: string;
  balance: number;
  bonus_points: number;
  cashback_total: number;
  cashback_today_percent: number;
}

export interface SavedCard {
  id: number;
  brand: 'UZCARD' | 'HUMO';
  last4: string;
  is_main: boolean;
}

/**
 * Wire types that come back from `/mobile/wallet/transactions`. The
 * actual list is whatever `ClientTransaction::type` is set to on the
 * BE — typically:
 *   - `topup`        — user credited their wallet (self-service / till)
 *   - `bonus`        — cashback credit from a paid session
 *   - `package`      — bought a time-package (debit)
 *   - `subscription` — recurring plan charge
 *   - `tier_bonus`   — bonus credited on rank promotion
 *   - `mission_bonus`— mission completion reward
 *   - `charge`       — generic debit (session billing tick, manual debit)
 *   - `refund`       — operator-issued refund
 *
 * Pre-fix the FE typed this as `'topup' | 'booking' | 'refund' | 'cashback'`
 * which (a) included `'booking'` that the BE never emits and
 * (b) excluded every real type except topup/refund. UI code reading
 * `tx.type` could never reliably know what kind of row it was looking
 * at — the open `string` fallback lets unknown types render with a
 * neutral label instead of crashing the screen.
 */
export type TransactionType =
  | 'topup'
  | 'bonus'
  | 'package'
  | 'subscription'
  | 'tier_bonus'
  | 'mission_bonus'
  | 'charge'
  | 'refund'
  | string;

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  /** Free-form comment from the BE (ClientTransaction.comment). Optional. */
  description: string;
  created_at: string;
  /** BE always emits 'success' currently — pending/failed are placeholders for the PSP-backed flow. */
  status: 'success' | 'pending' | 'failed';
}

export interface TopupResult {
  ok: boolean;
  transaction_id?: number;
  /** Provider redirect URL (Payme/Click) when manual confirmation is required. */
  redirect_url?: string;
}

export async function getBalance(): Promise<WalletBalance> {
  const res = await apiGet<ApiResource<WalletBalance>>('/mobile/wallet/balance');
  return res.data;
}

/**
 * Wallet endpoints return `{items: [...]}` — pre-fix (deep audit) the
 * FE typed them as bare arrays and would crash on `.map(...)` because
 * the response was an object, not an array.
 */
interface WalletItemsResponse<T> {
  items: T[];
}

export async function listCards(): Promise<SavedCard[]> {
  const res = await apiGet<ApiResource<WalletItemsResponse<SavedCard>>>('/mobile/wallet/cards');
  return Array.isArray(res.data?.items) ? res.data.items : [];
}

export async function listTransactions(limit?: number): Promise<Transaction[]> {
  const url = limit
    ? `/mobile/wallet/transactions?limit=${limit}`
    : '/mobile/wallet/transactions';
  const res = await apiGet<ApiResource<WalletItemsResponse<Transaction>>>(url);
  return Array.isArray(res.data?.items) ? res.data.items : [];
}

export async function topup(body: {
  amount: number;
  method: PaymentMethod;
}): Promise<TopupResult> {
  const res = await apiPost<ApiResource<TopupResult>>('/mobile/wallet/topup', body);
  return res.data;
}
