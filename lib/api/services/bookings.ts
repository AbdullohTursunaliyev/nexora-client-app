import { apiDelete, apiGet } from '../client';
import type { ApiResource } from '../types';

export type BookingStatus = 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: number;
  status: BookingStatus;
  tenant_id: number;
  tenant_name: string;
  pc_code: string;
  zone_name: string;
  start_at: string;
  end_at: string;
  duration_hours: number;
  total_amount: number;
  cover_url?: string;
  rating?: number;
}

interface ListResp {
  items: Booking[];
}

export async function listUpcoming(): Promise<Booking[]> {
  const res = await apiGet<ApiResource<ListResp>>('/mobile/bookings/upcoming');
  return res.data?.items ?? [];
}

export async function listHistory(): Promise<Booking[]> {
  const res = await apiGet<ApiResource<ListResp>>('/mobile/bookings/history');
  return res.data?.items ?? [];
}

export async function cancelBooking(id: number): Promise<{ ok: boolean }> {
  const res = await apiDelete<ApiResource<{ ok: boolean }>>(`/mobile/bookings/${id}`);
  return res.data;
}

// `getReceiptUrl(id)` was removed — the BE has no /bookings/{id}/receipt
// route, and the FE Download-receipts CTA was retired alongside it.
// Re-introduce both together when the receipt-generation service ships.
