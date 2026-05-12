import { apiGet } from '../client';
import type { ApiResource } from '../types';

export type LeaderboardScope = 'global' | 'region' | 'friends';

export interface LeaderboardPlayer {
  rank: number;
  user_id: number;
  name: string;
  rating: number;
  avatar_url?: string;
  is_me?: boolean;
}

interface Response {
  game: string;
  season: number;
  scope: LeaderboardScope;
  top: LeaderboardPlayer[];
  me?: LeaderboardPlayer;
}

interface Params {
  game?: string;
  scope?: LeaderboardScope;
  season?: number;
  limit?: number;
}

export async function getLeaderboard(params?: Params): Promise<Response> {
  const qs = new URLSearchParams();
  if (params?.game) qs.set('game', params.game);
  if (params?.scope) qs.set('scope', params.scope);
  if (params?.season != null) qs.set('season', String(params.season));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const url = qs.toString()
    ? `/mobile/leaderboard?${qs.toString()}`
    : '/mobile/leaderboard';
  const res = await apiGet<ApiResource<Response>>(url);
  return res.data;
}
