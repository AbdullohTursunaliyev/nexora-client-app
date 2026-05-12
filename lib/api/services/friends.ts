import { apiGet, apiPost, apiDelete } from '../client';
import type { ApiResource } from '../types';

/**
 * Friends service — adapts the live BE shape (snake_case + nested
 * keys) to the FE's `FriendUser` / `FriendRequest` / `FriendInvite`
 * types. Pre-fix (deep audit) this file declared an idealised shape
 * that did NOT match what the BE actually returned, so almost every
 * function silently produced empty data:
 *
 *   • `listFriendsAndRequests` read `res.data.pending_requests` but
 *     the BE returns `{friends, incoming, outgoing}` — incoming
 *     never surfaced in the FE.
 *   • `searchFriends` read `res.data.users` but the BE returns
 *     `{items: [...]}` — search results never displayed.
 *   • `listInvites` read `res.data.invites` but the BE returns
 *     `{incoming, outgoing}` — session invites never appeared.
 *   • `sendFriendRequest` posted `{target_user_id}` but the BE
 *     expects `{friend_mobile_user_id}` — every POST 422'd.
 *   • `inviteFriend` posted `{target_user_id, pc_id}` but the BE
 *     expects `{friend_mobile_user_id, note}` — same 422.
 *
 * The fix below preserves the FE-facing types (so call sites and
 * tests don't change) but adapts the raw BE rows on the way in/out.
 */

export interface FriendUser {
  id: number;
  login: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  online?: boolean;
}

export interface FriendRequest {
  id: number;
  from_user: FriendUser;
  to_user?: FriendUser;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface FriendInvite {
  id: number;
  from_user: FriendUser;
  pc_id?: number;
  pc_code?: string;
  message?: string;
  created_at: string;
}

// ---- Raw BE shapes (snake_case as returned by Laravel) ----------------

/** Item shape inside `index()`'s `{friends, incoming, outgoing}` arrays. */
interface RawFriendshipItem {
  friendship_id: number;
  mobile_user_id: number;
  login: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  status: 'pending' | 'accepted' | 'blocked';
  requested_by_mobile_user_id?: number;
  accepted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface RawFriendsIndexResponse {
  friends: RawFriendshipItem[];
  incoming: RawFriendshipItem[];
  outgoing: RawFriendshipItem[];
}

/** Item shape inside `search()`'s `{items: [...]}`. */
interface RawSearchItem {
  mobile_user_id: number;
  login: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  relation_status?: string;
}

interface RawSearchResponse {
  items: RawSearchItem[];
}

/** Item shape inside `invites()`'s `{incoming, outgoing}`. */
interface RawInviteItem {
  invite_id: number;
  from_mobile_user_id?: number;
  from_login?: string;
  to_mobile_user_id?: number;
  to_login?: string;
  note?: string | null;
  status?: 'pending' | 'accept' | 'reject';
  created_at?: string;
}

interface RawInvitesResponse {
  incoming: RawInviteItem[];
  outgoing: RawInviteItem[];
}

// ---- Adapters ----------------------------------------------------------

function adaptFriendUser(raw: {
  mobile_user_id?: number;
  id?: number;
  login: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}): FriendUser {
  return {
    id: Number(raw.mobile_user_id ?? raw.id ?? 0),
    login: String(raw.login ?? ''),
    first_name: raw.first_name ?? undefined,
    last_name: raw.last_name ?? undefined,
    avatar_url: raw.avatar_url ?? undefined,
  };
}

function adaptFriendshipToRequest(item: RawFriendshipItem): FriendRequest {
  // For `incoming`, the OTHER user is the requester. We expose them as
  // `from_user` so the FE renders "X wants to be your friend".
  const fromUser = adaptFriendUser(item);
  return {
    id: Number(item.friendship_id),
    from_user: fromUser,
    status: (item.status as FriendRequest['status']) ?? 'pending',
    created_at: String(item.created_at ?? ''),
  };
}

function adaptInvite(item: RawInviteItem): FriendInvite {
  return {
    id: Number(item.invite_id ?? 0),
    from_user: {
      id: Number(item.from_mobile_user_id ?? 0),
      login: String(item.from_login ?? ''),
    },
    message: item.note ?? undefined,
    created_at: String(item.created_at ?? ''),
  };
}

// ---- Public API --------------------------------------------------------

/**
 * Single GET — the BE returns both friends + pending in one payload, so
 * we don't fan out two identical requests.
 */
export async function listFriendsAndRequests(): Promise<{
  friends: FriendUser[];
  pending: FriendRequest[];
}> {
  const res = await apiGet<ApiResource<RawFriendsIndexResponse>>('/mobile/friends');
  const raw = res.data ?? ({} as RawFriendsIndexResponse);
  return {
    friends: Array.isArray(raw.friends)
      ? raw.friends.map((r) => adaptFriendUser(r))
      : [],
    // `incoming` is what the BE calls pending-to-me — i.e. somebody
    // sent ME a friend request and is waiting on my response.
    pending: Array.isArray(raw.incoming)
      ? raw.incoming.map(adaptFriendshipToRequest)
      : [],
  };
}

/** Mening do'stlarim (mobile.auth) — convenience wrapper. */
export async function listFriends(): Promise<FriendUser[]> {
  const { friends } = await listFriendsAndRequests();
  return friends;
}

/** Pending so'rovlar (mobile.auth) — convenience wrapper. */
export async function listPendingRequests(): Promise<FriendRequest[]> {
  const { pending } = await listFriendsAndRequests();
  return pending;
}

/** Do'st qidirish login bo'yicha. */
export async function searchFriends(query: string): Promise<FriendUser[]> {
  const res = await apiGet<ApiResource<RawSearchResponse>>('/mobile/friends/search', {
    params: { q: query },
  });
  const raw = res.data ?? ({} as RawSearchResponse);
  return Array.isArray(raw.items) ? raw.items.map((r) => adaptFriendUser(r)) : [];
}

/**
 * Do'stlik so'rovi yuborish. BE expects `friend_mobile_user_id` as
 * the field name — pre-fix the FE sent `target_user_id` so every
 * call 422'd silently.
 */
export async function sendFriendRequest(targetUserId: number): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>('/mobile/friends/requests', {
    friend_mobile_user_id: targetUserId,
  });
  return res.data;
}

/** So'rovga javob (accept/reject). */
export async function respondFriendRequest(
  requestId: number,
  action: 'accept' | 'reject',
): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>(
    `/mobile/friends/requests/${requestId}/respond`,
    { action },
  );
  return res.data;
}

/**
 * Do'stni o'chirish. BE route is `DELETE /mobile/friends/{friendMobileUserId}`.
 */
export async function removeFriend(friendUserId: number): Promise<{ ok: boolean }> {
  const res = await apiDelete<ApiResource<{ ok: boolean }>>(`/mobile/friends/${friendUserId}`);
  return res.data;
}

// ---- Club session invites (client.auth required) ----------------------

/** Sessiyaga taklif olish (sizga kelgan takliflar). */
export async function listInvites(): Promise<FriendInvite[]> {
  const res = await apiGet<ApiResource<RawInvitesResponse>>('/mobile/friends/invites');
  const raw = res.data ?? ({} as RawInvitesResponse);
  return Array.isArray(raw.incoming) ? raw.incoming.map(adaptInvite) : [];
}

/**
 * Sessiyaga do'st chaqirish. BE expects `friend_mobile_user_id` + an
 * optional `note` — pre-fix the FE sent `target_user_id` + `pc_id`,
 * neither of which the BE accepts.
 */
export async function inviteFriend(
  targetUserId: number,
  note?: string,
): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>('/mobile/friends/invites', {
    friend_mobile_user_id: targetUserId,
    note: note ?? null,
  });
  return res.data;
}

/** Taklifga javob. */
export async function respondInvite(
  inviteId: number,
  action: 'accept' | 'reject',
): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>(
    `/mobile/friends/invites/${inviteId}/respond`,
    { action },
  );
  return res.data;
}
