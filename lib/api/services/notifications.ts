import { apiDelete, apiGet, apiPost } from '../client';
import type { ApiResource } from '../types';

export type NotificationCategory = 'all' | 'bookings' | 'tournaments' | 'offers' | 'system';

export interface AppNotification {
  id: number;
  category: Exclude<NotificationCategory, 'all'>;
  title: string;
  description: string;
  created_at: string;
  read: boolean;
  /** Optional CTA target route (e.g. /tournament-details?id=12) */
  action_url?: string;
}

interface ListResponse {
  items: AppNotification[];
  unread_count: number;
}

/**
 * Build a `?tenant_id=N` query string fragment shared by the three
 * mutation endpoints. The BE consistently treats `tenant_id=0` /
 * missing as "user-global only", so we only emit the param when we
 * have a real tenant id.
 */
function tenantQuery(tenantId?: number | null): string {
  if (!tenantId || tenantId <= 0) return '';
  return `?tenant_id=${tenantId}`;
}

/**
 * All notifications for the current user.
 *
 * Without a tenantId the BE only returns user-global notifications
 * (tenant_id IS NULL) — useful when the user hasn't switched into a
 * club yet. With tenantId, BE returns global *plus* that tenant's
 * scoped rows (bookings, tournaments, etc.), which is what the bell
 * badge wants to count on the home tab.
 */
export async function listNotifications(
  category?: NotificationCategory,
  tenantId?: number | null,
): Promise<ListResponse> {
  const qs = new URLSearchParams();
  if (category && category !== 'all') qs.set('category', category);
  if (tenantId) qs.set('tenant_id', String(tenantId));
  const url = qs.toString()
    ? `/mobile/client/notifications?${qs.toString()}`
    : '/mobile/client/notifications';
  const res = await apiGet<ApiResource<ListResponse>>(url);
  return res.data;
}

export async function markRead(id: number): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>(`/mobile/client/notifications/${id}/read`);
  return res.data;
}

/**
 * Mark every notification in the current scope as read.
 *
 * Pre-fix this fired without a tenant scope — the BE then only
 * marked rows with `tenant_id IS NULL` and left the user's
 * tenant-scoped notifications (booking confirms, tournament
 * reminders) UNREAD. The home tab's bell badge — which DOES fetch
 * with `tenant_id` — would refresh post-mutation and still see
 * those tenant rows as unread, so the badge "snapped back" to the
 * original count on the next pull-to-refresh.
 *
 * Now both this mutation and the GET use the same scope, so a
 * successful mark-all-read truly zeroes the bell for the user's
 * active club.
 */
export async function markAllRead(tenantId?: number | null): Promise<{ ok: boolean }> {
  const url = `/mobile/client/notifications/read-all${tenantQuery(tenantId)}`;
  const res = await apiPost<ApiResource<{ ok: boolean }>>(url);
  return res.data;
}

/**
 * Permanently delete every notification in the current scope.
 *
 * Same `tenant_id` semantics as listNotifications + markAllRead.
 * Without a tenant id only the user-global bucket is wiped; with
 * one, the user-global bucket PLUS that tenant's scoped rows go
 * together. Maps onto the BE's `DELETE /mobile/client/notifications`
 * route added alongside this signature — earlier mobile builds
 * tried to call this URL and received "method not supported"
 * because the route didn't exist yet.
 */
export async function clearAllNotifications(tenantId?: number | null): Promise<{ ok: boolean }> {
  const url = `/mobile/client/notifications${tenantQuery(tenantId)}`;
  const res = await apiDelete<ApiResource<{ ok: boolean }>>(url);
  return res.data;
}
