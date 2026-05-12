import { apiGet, apiPost } from '../client';
import type { ApiResource } from '../types';

export type TournamentStatus = 'live' | 'upcoming' | 'finished';

export interface Tournament {
  id: number;
  name: string;
  game: string;
  format: string; // e.g. "5v5"
  status: TournamentStatus;
  prize_pool: number;
  starts_at: string;
  registration_ends_at: string;
  teams_registered: number;
  teams_max: number;
  cover_url?: string;
  is_featured?: boolean;
}

export interface TournamentDetails extends Tournament {
  description?: string;
  prizes?: { rank: number; amount: number }[];
  server?: string;
  rules?: string;
}

interface TournamentsListParams {
  game?: string;
  status?: TournamentStatus | 'all';
}

export async function listTournaments(params?: TournamentsListParams): Promise<Tournament[]> {
  const qs = new URLSearchParams();
  if (params?.game) qs.set('game', params.game);
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  const url = qs.toString()
    ? `/mobile/tournaments?${qs.toString()}`
    : '/mobile/tournaments';
  const res = await apiGet<ApiResource<Tournament[]>>(url);
  return res.data;
}

export async function getTournament(id: number): Promise<TournamentDetails> {
  const res = await apiGet<ApiResource<TournamentDetails>>(`/mobile/tournaments/${id}`);
  return res.data;
}

export async function registerForTournament(id: number, teamId?: number): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>(
    `/mobile/tournaments/${id}/register`,
    teamId ? { team_id: teamId } : {},
  );
  return res.data;
}
