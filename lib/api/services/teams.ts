import { apiGet, apiPost } from '../client';
import type { ApiResource } from '../types';

export interface Player {
  user_id: number;
  name: string;
  level: number;
  role: string;
  elo: number;
  status: 'online' | 'in-game' | 'offline';
  avatar_url?: string;
  has_mic?: boolean;
}

export interface Team {
  id: number;
  name: string;
  game: string;
  members_count: number;
  members_max: number;
  is_recruiting: boolean;
  cover_url?: string;
}

export interface ChatMessage {
  id: number;
  team_id: number;
  user_id: number;
  user_name: string;
  user_avatar_url?: string;
  text: string;
  created_at: string;
  reactions?: Record<string, number>;
  is_self?: boolean;
}

interface SearchParams {
  game?: string;
  micOnly?: boolean;
}

export async function searchPlayers(params?: SearchParams): Promise<Player[]> {
  const qs = new URLSearchParams();
  if (params?.game) qs.set('game', params.game);
  if (params?.micOnly) qs.set('mic', '1');
  const url = qs.toString() ? `/mobile/teams/players?${qs.toString()}` : '/mobile/teams/players';
  const res = await apiGet<ApiResource<Player[]>>(url);
  return res.data;
}

export async function listTeams(game?: string): Promise<Team[]> {
  const url = game ? `/mobile/teams?game=${game}` : '/mobile/teams';
  const res = await apiGet<ApiResource<Team[]>>(url);
  return res.data;
}

export async function createTeam(body: { name: string; game: string }): Promise<Team> {
  const res = await apiPost<ApiResource<Team>>('/mobile/teams', body);
  return res.data;
}

export async function inviteToTeam(teamId: number, userId: number): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>(`/mobile/teams/${teamId}/invite`, {
    user_id: userId,
  });
  return res.data;
}

// ---- Team chat ----

export async function listMessages(teamId: number): Promise<ChatMessage[]> {
  const res = await apiGet<ApiResource<ChatMessage[]>>(`/mobile/teams/${teamId}/messages`);
  return res.data;
}

export async function sendMessage(teamId: number, text: string): Promise<ChatMessage> {
  const res = await apiPost<ApiResource<ChatMessage>>(`/mobile/teams/${teamId}/messages`, {
    text,
  });
  return res.data;
}

export async function reactToMessage(
  teamId: number,
  messageId: number,
  emoji: string,
): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>(
    `/mobile/teams/${teamId}/messages/${messageId}/react`,
    { emoji },
  );
  return res.data;
}
