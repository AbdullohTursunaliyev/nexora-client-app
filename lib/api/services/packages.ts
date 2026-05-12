import { apiGet } from '../client';
import type { ApiResource } from '../types';

/**
 * Booking-flow data sources that used to be hardcoded constants on the
 * FE (the four mock packages, the five fake hourly slots `10:00..14:00`).
 *
 * Both endpoints live under client.auth so tenant context is implicit
 * — the BE reads it from the resolved middleware state and returns
 * packages / slots for the user's currently-switched tenant.
 *
 * Cache: not needed at this layer. `time-select.tsx` mounts once per
 * booking flow and the call is < 500 B over the wire. If we ever need
 * to dedupe across pre-fetches (e.g. show packages count on the zone-
 * select screen), bolt on the same in-flight + TTL pattern used in
 * `pcs.ts`.
 */

export interface PackageItem {
  id: number;
  name: string;
  description: string;
  duration_min: number;
  bonus_minutes: number;
  validity_days: number;
  price: number;
  /** Zone label as stored on the package row ("PC", "VIP", "PS5", etc.). */
  zone: string;
}

export interface BookingSlot {
  /** "HH:MM" 24h. The hour-aligned start time. */
  time: string;
  hour: number;
  /** True when this hour falls inside a non-default `zone_pricing_window`. */
  is_peak: boolean;
  window: {
    id: number;
    name: string;
    price_per_hour: number;
  } | null;
}

export interface BookingSlotsResponse {
  date: string;
  duration_min: number;
  slots: BookingSlot[];
  has_slots: boolean;
}

/** GET /mobile/packages — tenant's active package catalog. */
export async function listPackages(): Promise<PackageItem[]> {
  const res = await apiGet<ApiResource<{ packages: PackageItem[] }>>('/mobile/packages');
  return res.data.packages ?? [];
}

interface ListSlotsParams {
  /** YYYY-MM-DD; defaults to today on the BE if omitted. */
  date?: string;
  /** Defaults to 60 on the BE if omitted. Clamped 30..1440. */
  durationMin?: number;
  /** Filter pricing windows to a specific zone, if known. */
  zoneId?: number | null;
}

/**
 * GET /mobile/booking/slots — bookable start hours for the date+duration.
 *
 * Replaces the FE hardcoded `TIME_SLOTS = ['10:00'..'14:00']`. The BE
 * generates slots from `open_24h`, the current clock (rounded up on
 * today's date to avoid past-time selection), and the requested
 * duration (so a 3-hour booking can't start at 23:00 when the club
 * closes at 24:00). Each slot is annotated with the active pricing
 * window so the FE can flag peak hours.
 */
export async function listBookingSlots(params?: ListSlotsParams): Promise<BookingSlotsResponse> {
  const qs = new URLSearchParams();
  if (params?.date) qs.set('date', params.date);
  if (params?.durationMin != null) qs.set('duration_min', String(params.durationMin));
  if (params?.zoneId != null) qs.set('zone_id', String(params.zoneId));
  const tail = qs.toString();
  const url = tail ? `/mobile/booking/slots?${tail}` : '/mobile/booking/slots';
  const res = await apiGet<ApiResource<BookingSlotsResponse>>(url);
  return res.data;
}
