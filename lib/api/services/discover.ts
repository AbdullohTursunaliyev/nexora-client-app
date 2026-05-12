import { apiGet } from '../client';
import type { ApiResource } from '../types';

export interface NearbyClub {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  lat: number;
  lng: number;
  distance_km: number;
  pc_count: number;
  has_ps_zone: boolean;
  is_open: boolean;
  open_24h?: boolean;
  cover_url: string;
  address: string;
  joined: boolean;
  discount_text?: string;
}

interface NearbyParams {
  lat?: number;
  lng?: number;
  city?: string;
  rating_min?: number;
  distance_max_km?: number;
}

export async function listNearby(params?: NearbyParams): Promise<NearbyClub[]> {
  const qs = new URLSearchParams();
  if (params?.lat != null) qs.set('lat', String(params.lat));
  if (params?.lng != null) qs.set('lng', String(params.lng));
  if (params?.city) qs.set('city', params.city);
  if (params?.rating_min != null) qs.set('rating_min', String(params.rating_min));
  if (params?.distance_max_km != null) qs.set('distance_max_km', String(params.distance_max_km));
  const url = qs.toString() ? `/mobile/discover/clubs?${qs.toString()}` : '/mobile/discover/clubs';
  const res = await apiGet<ApiResource<NearbyClub[]>>(url);
  return res.data;
}
