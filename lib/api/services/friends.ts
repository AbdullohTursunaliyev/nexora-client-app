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
  /** E.164-ish phone (digits-only canonical form, may have +). */
  phone?: string;
  online?: boolean;
}

/**
 * One row in `/mobile/friends/activity` — a friend + their current
 * playing-status snapshot. Polled every ~10-15 s by the friends list
 * so the user sees "Akmal is playing PC-04 at Cyberium" in near-real
 * time. See BE MobileFriendService::activity for the lookup chain.
 */
export interface FriendActivityItem extends FriendUser {
  status: 'in_session' | 'offline';
  current_club: { tenant_id: number; tenant_name: string } | null;
  current_pc: { id: number; code: string } | null;
  session: { id: number; started_at: string | null; is_package: boolean } | null;
}

/**
 * Relation of a SEARCHED user to the current viewer. Drives the
 * action chip on each search-row: only `none` should show "Add",
 * `outgoing` shows "Sent (cancel?)", `incoming` shows "Accept",
 * `accepted` shows "Friends" (no action).
 *
 * Pre-fix (audit P1) the FE adapter dropped this field, so every
 * search row rendered the same "Add" button regardless of state.
 * Tapping "Add" on an already-friend or already-pending row 422'd
 * with a "Friendship already exists" toast — the user couldn't
 * tell from the UI that the row was already actioned.
 */
export type FriendRelationStatus =
  | 'none'
  | 'outgoing'
  | 'incoming'
  | 'accepted'
  | 'blocked';

export interface FriendSearchResult extends FriendUser {
  relation_status: FriendRelationStatus;
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
  phone?: string | null;
}): FriendUser {
  return {
    id: Number(raw.mobile_user_id ?? raw.id ?? 0),
    login: String(raw.login ?? ''),
    first_name: raw.first_name ?? undefined,
    last_name: raw.last_name ?? undefined,
    avatar_url: raw.avatar_url ?? undefined,
    phone: raw.phone ?? undefined,
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
 * Single GET — the BE returns friends + incoming + outgoing in one
 * payload. Exposing all three lets the FE render:
 *   - `friends`        → "My friends" section (accepted)
 *   - `pending`        → incoming requests waiting on MY response
 *   - `outgoing`       → requests *I* sent that the other user
 *                        hasn't answered yet — pre-fix the FE
 *                        silently discarded this, so a user with 5
 *                        pending outgoing requests saw nothing and
 *                        had no way to cancel them.
 *
 * `pending` is kept as a separate key for backwards compatibility
 * (existing call sites read `.pending`); new code should read
 * `incoming` + `outgoing` directly via the destructured shape.
 */
export async function listFriendsAndRequests(): Promise<{
  friends: FriendUser[];
  pending: FriendRequest[];
  outgoing: FriendRequest[];
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
    // `outgoing` is what *I* sent. The user-shaped object inside is
    // the RECIPIENT (so the FE can render "Waiting on @recipient").
    outgoing: Array.isArray(raw.outgoing)
      ? raw.outgoing.map(adaptFriendshipToRequest)
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

/**
 * Do'st qidirish login bo'yicha.
 *
 * Returns `FriendSearchResult` (extends `FriendUser`) with the
 * `relation_status` field the BE attaches. The caller uses this to
 * pick the right action button per row:
 *   - 'none'      → "Add" (POST sendRequest)
 *   - 'outgoing'  → "Sent" (DELETE cancels)
 *   - 'incoming'  → "Accept" (BE auto-accepts on second sendRequest
 *                   from the reverse side)
 *   - 'accepted'  → "Friends" (no action)
 *   - 'blocked'   → row hidden / "Blocked" badge
 *
 * Pre-fix the BE field was dropped during the adapter step, so the
 * UI rendered "Add" for every row regardless of state — tapping it
 * for an already-friend or already-pending row 422'd silently.
 */
export async function searchFriends(query: string): Promise<FriendSearchResult[]> {
  const res = await apiGet<ApiResource<RawSearchResponse>>('/mobile/friends/search', {
    params: { q: query },
  });
  const raw = res.data ?? ({} as RawSearchResponse);
  return Array.isArray(raw.items)
    ? raw.items.map((r) => ({
        ...adaptFriendUser(r),
        relation_status: normalizeRelationStatus(r.relation_status),
      }))
    : [];
}

/**
 * Map the BE's `relation_status` enum into the FE union type. The
 * BE returns strings like "none" / "outgoing" / "incoming" /
 * "accepted" / "blocked" — anything else (legacy data, future
 * status we don't know about yet) collapses to `'none'` so the
 * caller renders a safe "Add" affordance instead of crashing on an
 * exhaustive switch.
 */
function normalizeRelationStatus(raw: string | undefined): FriendRelationStatus {
  switch (raw) {
    case 'outgoing':
    case 'incoming':
    case 'accepted':
    case 'blocked':
      return raw;
    default:
      return 'none';
  }
}

/**
 * Do'stlik so'rovi yuborish. BE expects `friend_mobile_user_id` as
 * the field name.
 *
 * The BE auto-promotes pending → accepted when the recipient already
 * has an OUTGOING request to the caller (i.e. caller is accepting a
 * reverse-pending). In that case the response `status` is
 * `'accepted'` instead of `'pending'`. Callers can use the returned
 * `status` for an accurate optimistic UI flip — e.g. the search row
 * should jump straight to "Friend" not "Sent" when the BE
 * auto-accepted.
 */
export async function sendFriendRequest(
  targetUserId: number,
): Promise<{ ok: boolean; status: 'pending' | 'accepted' }> {
  const res = await apiPost<ApiResource<{ ok: boolean; status?: string }>>(
    '/mobile/friends/requests',
    { friend_mobile_user_id: targetUserId },
  );
  const status = res.data?.status === 'accepted' ? 'accepted' : 'pending';
  return { ok: !!res.data?.ok, status };
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
 *
 * The BE deletes the friendship row regardless of its status —
 * accepted, pending-outgoing, or pending-incoming all flow through
 * the same path. That means this endpoint also doubles as:
 *   - cancel an outgoing pending request I sent
 *   - reject an incoming pending request without going through
 *     `respondFriendRequest('reject')`
 * Callers should use the semantic alias (`cancelOutgoing`) when
 * that's the user-visible action, so the call site reads clearly.
 */
export async function removeFriend(friendUserId: number): Promise<{ ok: boolean }> {
  const res = await apiDelete<ApiResource<{ ok: boolean }>>(`/mobile/friends/${friendUserId}`);
  return res.data;
}

/**
 * Semantic alias for cancelling a pending outgoing friend request.
 * Wraps the same DELETE as `removeFriend` since the BE doesn't
 * distinguish — but separating the call sites keeps the FE intent
 * (cancel vs. unfriend) readable in the consumer.
 */
export async function cancelOutgoingRequest(
  recipientUserId: number,
): Promise<{ ok: boolean }> {
  return removeFriend(recipientUserId);
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

// ---- Live activity (polled) -------------------------------------------

interface RawFriendActivityItem {
  mobile_user_id: number;
  login: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  status: 'in_session' | 'offline';
  current_club: { tenant_id: number; tenant_name: string } | null;
  current_pc: { id: number; code: string } | null;
  session: { id: number; started_at: string | null; is_package: boolean } | null;
}

interface RawFriendActivityResponse {
  friends: RawFriendActivityItem[];
}

/**
 * GET /mobile/friends/activity — live playing-status rollup.
 *
 * Returns the caller's accepted friends sorted with "in_session"
 * first, each annotated with their current club + PC (or null when
 * offline). The mobile FE polls this every ~10-15 s — see the
 * friends list screen for the hook that drives the cadence.
 *
 * Empty list ⇒ user has no accepted friends. Same payload shape as
 * any other case so consumers don't need a special branch for it.
 */
export async function friendActivity(): Promise<FriendActivityItem[]> {
  const res = await apiGet<ApiResource<RawFriendActivityResponse>>(
    '/mobile/friends/activity',
  );
  const raw = res.data ?? ({} as RawFriendActivityResponse);
  if (!Array.isArray(raw.friends)) return [];
  return raw.friends.map(
    (r): FriendActivityItem => ({
      ...adaptFriendUser(r),
      status: r.status === 'in_session' ? 'in_session' : 'offline',
      current_club: r.current_club ?? null,
      current_pc: r.current_pc ?? null,
      session: r.session ?? null,
    }),
  );
}
