import { apiGet, apiPost, apiDelete } from '../client';
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
  /**
   * BE flag for placeholder rows where we DON'T have real presence /
   * level / ELO data yet — the row exists (a real mobile_user is on
   * the other end of the id) but `level`, `role`, `elo`, `status`,
   * `has_mic` are stubs. The FE should hide rank chips and presence
   * dots when `is_stub` is true so the user isn't misled into
   * thinking "LVL 1, 1200 ELO, offline" is an authoritative read.
   *
   * Pre-fix this field was returned by the BE but stripped at the
   * adapter boundary, so every demo player rendered like a real one.
   */
  is_stub?: boolean;
}

export interface Team {
  id: number;
  name: string;
  game: string;
  members_count: number;
  members_max: number;
  is_recruiting: boolean;
  cover_url?: string;
  /**
   * Per-caller membership info. Set by the BE in `index()` and
   * `store()` based on the caller's mobile_user_id:
   *   - `is_owner`  → caller can invite, disband
   *   - `is_member` → caller can chat, leave, see members
   *   - `role`      → 'owner' | 'member' | null (not a member)
   *
   * Pre-fix the FE couldn't distinguish "my team" from "some other
   * team in this tenant", so the invite picker showed EVERY team
   * and tapping a non-owned one 422'd with "Forbidden". Same data
   * also powers the "My Teams" section on team-finder.
   */
  is_owner?: boolean;
  is_member?: boolean;
  role?: 'owner' | 'member' | null;
}

/**
 * An incoming team invite — surfaced via `listTeamInvites`. The
 * `id` is the `team_members` row id (the same id passed to
 * `respondToTeamInvite`); `team_id` is the underlying team.
 *
 * Pre-fix the FE service had NO function to fetch invites — the
 * BE endpoint shipped months ago but the UI never wired up. So
 * invitees received a TeamMember row with role='invited' that sat
 * forever; the only way to "accept" was for the inviter to keep
 * spamming until the BE's idempotent path silently flipped them.
 */
export interface TeamInvite {
  id: number;
  team_id: number;
  team_name: string;
  game: string;
  members_max: number;
  /** ISO-8601. Null on rare legacy rows that pre-date the column. */
  invited_at: string | null;
}

/**
 * A row in the team's members list — `role` distinguishes the
 * confirmed roster (owner/member) from outstanding invites that
 * the invitee hasn't accepted yet.
 */
export interface TeamMember {
  membership_id: number;
  user_id: number;
  login: string;
  name: string;
  avatar_url?: string | null;
  role: 'owner' | 'member' | 'invited';
  is_self: boolean;
  joined_at: string | null;
}

export interface ChatMessage {
  id: number;
  team_id: number;
  user_id: number;
  user_name: string;
  user_avatar_url?: string;
  text: string;
  created_at: string;
  /** Emoji → count. Keys are the BE-stored emoji strings. */
  reactions?: Record<string, number>;
  /**
   * The set of emojis the CALLING USER has already reacted with on
   * this message. Lets the FE render their reaction pill as
   * "active" and skip re-POSTing the same emoji.
   *
   * Pre-fix the FE didn't read this field, so users could tap the
   * thumbs-up over and over — the BE silently deduped via
   * `firstOrCreate`, but the count never reflected the duplicates
   * (good) and the FE provided no visual feedback that the action
   * had been registered (bad).
   */
  my_reactions?: string[];
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

// ---- Team invites (incoming, for the invitee) ----

/**
 * Pending team invites for the calling user. Powers the invite badge
 * + accept/decline UI on the team-finder screen.
 */
export async function listTeamInvites(): Promise<TeamInvite[]> {
  const res = await apiGet<ApiResource<TeamInvite[]>>('/mobile/teams/invites');
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Accept or decline a team invite. The BE re-checks team capacity
 * inside a row lock on accept — if the team filled up between
 * invite send and accept, this returns 422 "Team is full".
 */
export async function respondToTeamInvite(
  inviteId: number,
  action: 'accept' | 'decline',
): Promise<{ ok: boolean; status: 'accepted' | 'declined' }> {
  const res = await apiPost<
    ApiResource<{ ok: boolean; status?: string }>
  >(`/mobile/teams/invites/${inviteId}/respond`, { action });
  const status: 'accepted' | 'declined' =
    res.data?.status === 'accepted' ? 'accepted' : 'declined';
  return { ok: !!res.data?.ok, status };
}

// ---- Leave / disband ----

/**
 * Member leaves a team. BE returns 422 when the caller is the
 * owner (with a hint to use disbandTeam instead) — the FE should
 * gate this behind a UI check anyway, but the BE guard is the
 * authoritative one.
 */
export async function leaveTeam(teamId: number): Promise<{ ok: boolean }> {
  const res = await apiDelete<ApiResource<{ ok: boolean }>>(`/mobile/teams/${teamId}/leave`);
  return res.data;
}

/**
 * Owner disbands the team. Cascades to members + messages via DB
 * FK constraints. Non-owners get 403.
 */
export async function disbandTeam(teamId: number): Promise<{ ok: boolean }> {
  const res = await apiDelete<ApiResource<{ ok: boolean }>>(`/mobile/teams/${teamId}`);
  return res.data;
}

// ---- Team members ----

/**
 * GET /mobile/teams/{teamId}/members
 *
 * Lists confirmed members + pending invites. Caller must be a
 * member of the team (BE returns 403 otherwise). Used by the
 * team-chat Members tab.
 */
export async function listTeamMembers(teamId: number): Promise<TeamMember[]> {
  const res = await apiGet<ApiResource<TeamMember[]>>(`/mobile/teams/${teamId}/members`);
  return Array.isArray(res.data) ? res.data : [];
}

// ---- Team chat ----

interface ListMessagesParams {
  /**
   * Cursor for the "load more older" pagination. Pass the smallest
   * `id` you've already loaded; the BE returns messages with
   * `id < beforeId`. Omit on first page.
   */
  beforeId?: number;
  /**
   * Hard cap is 100 (BE-enforced). Default 50 keeps the initial
   * window snappy for cold mounts.
   */
  limit?: number;
}

/**
 * Cursor-paginated chat messages, returned chronologically (oldest
 * first) inside the response window — the BE reverses internally so
 * the FE can append the array directly to the bottom of the chat.
 *
 * Pre-fix the FE called this with no params and the BE returned the
 * OLDEST 200 messages. Once a team reached 200 messages, brand-new
 * ones never surfaced. The BE was rewritten to return the LATEST
 * `limit` messages with cursor-based "load more on scroll-up" — but
 * the FE service still ignored the params, so the load-more flow
 * was unreachable. Now both args are honoured.
 */
export async function listMessages(
  teamId: number,
  params?: ListMessagesParams,
): Promise<ChatMessage[]> {
  const qs = new URLSearchParams();
  if (params?.beforeId != null && Number.isFinite(params.beforeId)) {
    qs.set('before_id', String(params.beforeId));
  }
  if (params?.limit != null && Number.isFinite(params.limit)) {
    qs.set('limit', String(params.limit));
  }
  const tail = qs.toString();
  const url = tail
    ? `/mobile/teams/${teamId}/messages?${tail}`
    : `/mobile/teams/${teamId}/messages`;
  const res = await apiGet<ApiResource<ChatMessage[]>>(url);
  return Array.isArray(res.data) ? res.data : [];
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
