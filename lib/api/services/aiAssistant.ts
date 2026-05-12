import { apiGet, apiPost } from '../client';
import type { ApiResource } from '../types';

export interface AiTip {
  id: number;
  icon: string; // semantic key — 'clock' | 'check' | 'lightning' | etc.
  text: string;
  color?: string;
}

export interface AiMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  created_at: string;
}

export interface RecommendedClub {
  club_id: string;
  name: string;
  rating: number;
  distance_km: number;
  pc_count: number;
  has_ps_zone?: boolean;
  badge_text?: string;
  cover_url?: string;
}

export interface RecommendedZone {
  id: string;
  name: string;
  meta: string;
  color: string;
}

export interface RecommendedTimeSlot {
  range: string;
  label: string;
  bonus_text?: string;
}

interface RecommendationsResponse {
  clubs: RecommendedClub[];
  zones: RecommendedZone[];
  times: RecommendedTimeSlot[];
}

export async function getTips(): Promise<AiTip[]> {
  const res = await apiGet<ApiResource<AiTip[]>>('/mobile/ai/tips');
  return res.data;
}

export async function getRecommendations(): Promise<RecommendationsResponse> {
  const res = await apiGet<ApiResource<RecommendationsResponse>>('/mobile/ai/recommendations');
  return res.data;
}

export async function listChat(): Promise<AiMessage[]> {
  const res = await apiGet<ApiResource<AiMessage[]>>('/mobile/ai/chat');
  return res.data;
}

export async function sendChat(text: string): Promise<AiMessage> {
  const res = await apiPost<ApiResource<AiMessage>>('/mobile/ai/chat', { text });
  return res.data;
}
