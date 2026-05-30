import { apiGet } from '../client';
import type { ApiResource } from '../types';

export interface ReferralResponse {
  code: string;
  invite_url: string;
  total_invites: number;
  active_friends: number;
  points_earned: number;
  milestones: {
    id: number;
    /**
     * Legacy uz-only string. New builds ignore this and compose the
     * localised label from `target` via the i18n template. Kept here
     * so the BE remains free to drop it later without breaking older
     * app builds.
     */
    label?: string;
    /** i18n key the BE recommends; the FE matches it to a template. */
    label_key?: string;
    progress: number;
    target: number;
    reward_points: number;
    completed: boolean;
  }[];
}

export async function getReferralInfo(): Promise<ReferralResponse> {
  const res = await apiGet<ApiResource<ReferralResponse>>('/mobile/client/referrals');
  return res.data;
}
