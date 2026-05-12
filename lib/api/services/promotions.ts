import { apiGet } from '../client';
import type { ApiResource } from '../types';

/**
 * Promotion as surfaced by the mobile `/promotions` endpoint.
 *
 * Backed by the `promotions` table in BE — `tenant_id` is implicit
 * (the endpoint runs under `client.auth` so the response is already
 * scoped to the user's current tenant).
 */
export interface Promotion {
  id: string;
  title: string;
  description: string;
  /** Engine-side category, e.g. `double_topup`. Useful for icon picks. */
  type: string;
  bonus_percent: number | null;
  /** Promo code the user can show staff (nullable when promo auto-applies). */
  code: string | null;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
}

export async function listPromotions(): Promise<Promotion[]> {
  const res = await apiGet<ApiResource<Promotion[]>>('/mobile/promotions');
  return res.data;
}
