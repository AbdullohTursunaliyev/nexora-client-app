import type { AxiosRequestConfig } from 'axios';
import { apiGet, apiPost } from '../client';
import type { ApiResource } from '../types';

/**
 * POST helper that attaches a caller-supplied Idempotency-Key header
 * ONLY when a key is actually provided. Mirrors
 * `pcs.ts::postWithIdempotency` byte-for-byte.
 *
 * Why the conditional arg-count: a money write (`topup`) must let a
 * retry / accidental double-tap reuse the SAME key so the BE de-dups a
 * retried POST instead of crediting the wallet twice. But when no key
 * is passed we forward exactly two args to `apiPost`, keeping the call
 * shape byte-identical to the pre-change form — so the existing Jest
 * assertion `toHaveBeenCalledWith('/mobile/wallet/topup', body)`
 * (which fails on an extra explicit `undefined` third arg) stays
 * green. Only the key'd call site gets the third config argument.
 */
function postWithIdempotency<T>(
  url: string,
  body: unknown,
  idempotencyKey?: string,
): Promise<T> {
  if (!idempotencyKey) {
    return apiPost<T>(url, body);
  }
  const config: AxiosRequestConfig = {
    headers: { 'Idempotency-Key': idempotencyKey },
  };
  return apiPost<T>(url, body, config);
}

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

/**
 * Credit the wallet through a payment gateway (Payme/Click).
 *
 * `idempotencyKey` (optional): a stable UUID the caller mints ONCE per
 * top-up intent and reuses across retries / accidental double-taps of
 * Confirm. Top-up is a money flow — a flaky network mid-POST + a re-tap
 * could otherwise look like two distinct intents to the BE and credit
 * (or initiate a PSP charge for) the amount twice. When present it's
 * sent as the `Idempotency-Key` header so the BE returns the original
 * TopupResult instead of opening a second transaction. When omitted,
 * the request interceptor falls back to a per-request key (safe only
 * for non-retried callers). Same contract as
 * `pcs.ts::bookPc` / `openByQr`; see the `generateIdempotencyKey`
 * docblock in `lib/api/client.ts`.
 */
export async function topup(
  body: {
    amount: number;
    method: PaymentMethod;
  },
  idempotencyKey?: string,
): Promise<TopupResult> {
  const res = await postWithIdempotency<ApiResource<TopupResult>>(
    '/mobile/wallet/topup',
    body,
    idempotencyKey,
  );
  return res.data;
}

// ── Self-service top-up (client.auth `/client-auth/*` routes) ─────────
//
// These three endpoints back the in-app top-up flow (`app/wallet-topup.tsx`).
// They live under the `/client-auth` prefix (registered in
// `client.ts::CLIENT_AUTH_PREFIXES` so they carry the per-tenant
// client_token) and are deliberately gated: a club that hasn't connected
// a PSP returns an EMPTY `methods` array, and the FE then refuses to show
// any payment UI at all.

/** Wire shape of `GET /client-auth/payment-methods`. */
interface PaymentMethodsResponse {
  methods: PaymentMethod[];
}

/**
 * Wire shape of `POST /client-auth/topup`. snake_case as the BE emits it;
 * mapped to the camelCase `TopupOrder` below so screens never read raw
 * server keys.
 */
interface TopupOrderWire {
  order_id: string;
  provider: PaymentMethod;
  amount: number;
  checkout_url: string;
  status: TopupStatusValue;
}

/** Wire shape of `GET /client-auth/topup/{orderId}`. */
interface TopupStatusWire {
  order_id: string;
  status: TopupStatusValue;
  paid: boolean;
  provider: PaymentMethod;
  amount: number;
}

/**
 * Lifecycle states a top-up order moves through.
 *   - `pending`   — order created, PSP checkout not yet settled
 *   - `paid`      — PSP confirmed payment (webhook may still be crediting)
 *   - `completed` — wallet credited end-to-end
 *   - `cancelled` — user abandoned / PSP declined
 * Left open with `string` so a future BE-added state renders neutrally
 * instead of crashing the poller.
 */
export type TopupStatusValue = 'pending' | 'paid' | 'completed' | 'cancelled' | string;

/** Camel-cased top-up order returned to the screen layer. */
export interface TopupOrder {
  orderId: string;
  provider: PaymentMethod;
  amount: number;
  checkoutUrl: string;
  status: TopupStatusValue;
}

/** Camel-cased top-up status snapshot returned to the screen layer. */
export interface TopupStatus {
  orderId: string;
  status: TopupStatusValue;
  paid: boolean;
  provider: PaymentMethod;
  amount: number;
}

/**
 * Providers the club has actually connected, in display order. An EMPTY
 * array is the legitimate "this club hasn't enabled online top-up"
 * signal — the screen renders an info card (no payment UI) for it, never
 * a hidden/disabled provider. Defensive `Array.isArray` guard mirrors the
 * `listCards` / `listTransactions` pattern so a malformed body degrades to
 * "no methods" instead of throwing on `.map`.
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const res = await apiGet<ApiResource<PaymentMethodsResponse>>(
    '/client-auth/payment-methods',
  );
  return Array.isArray(res.data?.methods) ? res.data.methods : [];
}

/**
 * Open a top-up order against the chosen PSP. Returns the `checkoutUrl`
 * the screen hands to `WebBrowser.openBrowserAsync`. `amountSum` is in
 * SUM (minimum 1000 — validated screen-side before this call).
 *
 * No idempotency key here: unlike `topup` (which credits the wallet
 * directly), this only OPENS a checkout session — the actual credit
 * happens later via the PSP webhook keyed on `order_id`, so a retried
 * POST that creates a second pending order is harmless (the user only
 * ever pays the one they're redirected to). The request interceptor's
 * per-request fallback key is sufficient.
 */
export async function createTopupOrder(
  amountSum: number,
  provider: PaymentMethod,
): Promise<TopupOrder> {
  const res = await apiPost<ApiResource<TopupOrderWire>>('/client-auth/topup', {
    amount: amountSum,
    provider,
  });
  const w = res.data;
  return {
    orderId: w.order_id,
    provider: w.provider,
    amount: w.amount,
    checkoutUrl: w.checkout_url,
    status: w.status,
  };
}

/**
 * Poll a top-up order's status after the user returns from the PSP page.
 * `paid` is the authoritative "did money land" flag the screen acts on;
 * `status` carries the finer lifecycle for display.
 */
export async function getTopupStatus(orderId: string): Promise<TopupStatus> {
  const res = await apiGet<ApiResource<TopupStatusWire>>(
    `/client-auth/topup/${orderId}`,
  );
  const w = res.data;
  return {
    orderId: w.order_id,
    status: w.status,
    paid: w.paid,
    provider: w.provider,
    amount: w.amount,
  };
}
