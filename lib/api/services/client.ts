import { apiGet, apiPost } from '../client';
import type { ApiResource, ClientSummary } from '../types';

export interface Mission {
  code: string;
  title: string;
  description?: string;
  progress: number;
  target: number;
  reward_points?: number;
  is_completed?: boolean;
  is_claimed?: boolean;
}

interface ClientSummaryResponse extends ClientSummary {
  missions?: Mission[];
}

/** Mijoz xulosasi: balans, bonus, faol sessiya, missiyalar */
export async function getSummary(): Promise<ClientSummaryResponse> {
  const res = await apiGet<ApiResource<ClientSummaryResponse>>('/mobile/client/summary');
  return res.data;
}

export interface MissionClaimResult {
  ok: boolean;
  code: string;
  /** Bonus points awarded for completing this mission. */
  reward_bonus: number;
  /** New total bonus on the client account after the credit. */
  client_bonus: number;
  /**
   * Legacy alias — pre-fix the FE typed this as `reward` and the BE
   * always returned `reward_bonus`. Keep `reward` accessible as a
   * mirror so older call sites don't break while we migrate.
   */
  reward?: number;
}

/** Missiyani claim qilish (yutuqni olish) */
export async function claimMission(code: string): Promise<MissionClaimResult> {
  const res = await apiPost<ApiResource<MissionClaimResult>>(
    `/mobile/client/missions/${code}/claim`,
  );
  // Mirror reward_bonus onto the legacy `reward` field so older
  // callers that read `result.reward` still get the right number
  // until they're updated.
  const data = res.data;
  return {
    ...data,
    reward: typeof data.reward_bonus === 'number' ? data.reward_bonus : data.reward,
  };
}
