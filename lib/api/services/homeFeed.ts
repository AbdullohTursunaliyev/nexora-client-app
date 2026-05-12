import { apiGet } from '../client';
import type { ApiResource } from '../types';

export interface PromotionCard {
  id: number;
  title: string;
  subtitle?: string;
  badge_text?: string;
  cover_url: string;
  cta_text: string;
  cta_url: string;
}

export interface HomeFeedClub {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  distance_km: number;
  pc_count: number;
  has_ps_zone: boolean;
  is_open: boolean;
  open_24h?: boolean;
  cover_url: string;
  joined: boolean;
  balance?: number;
  discount_text?: string;
}

interface HomeFeedResponse {
  greeting_name: string;
  level: number;
  unread_notifications: number;
  promotions: PromotionCard[];
  joined_clubs: HomeFeedClub[];
  all_clubs: HomeFeedClub[];
}

export async function getFeed(): Promise<HomeFeedResponse> {
  const res = await apiGet<ApiResource<HomeFeedResponse>>('/mobile/home/feed');
  return res.data;
}
