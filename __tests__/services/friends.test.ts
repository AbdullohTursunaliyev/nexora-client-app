jest.mock('../../lib/api/client', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiDelete: jest.fn(),
  tokens: {
    setMobileToken: jest.fn(),
    setClientToken: jest.fn(),
    clear: jest.fn(),
    getMobileToken: jest.fn(),
    getClientToken: jest.fn(),
  },
}));

import { apiGet, apiPost, apiDelete } from '../../lib/api/client';
import * as friends from '../../lib/api/services/friends';

const mockedGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockedPost = apiPost as jest.MockedFunction<typeof apiPost>;
const mockedDelete = apiDelete as jest.MockedFunction<typeof apiDelete>;

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedDelete.mockReset();
});

/**
 * Tests verify the FE adapters match the LIVE BE response shapes (deep
 * audit fix). Pre-fix the friends service typed BE responses with keys
 * that never existed (`pending_requests`, `users`, `invites`), and the
 * tests baked those same wrong shapes in — so the suite stayed green
 * while the live app silently returned empty lists everywhere.
 *
 * BE shapes (per `MobileFriendService` + `MobileFriendController`):
 *   GET /mobile/friends         → {friends, incoming, outgoing}
 *   GET /mobile/friends/search  → {items: [{mobile_user_id, login, ...}]}
 *   POST /mobile/friends/requests        → body {friend_mobile_user_id}
 *   GET /mobile/friends/invites → {incoming, outgoing}
 *   POST /mobile/friends/invites→ body {friend_mobile_user_id, note}
 */
describe('friends service', () => {
  test('listFriends adapts mobile_user_id → id from /mobile/friends', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        friends: [
          { friendship_id: 1, mobile_user_id: 42, login: 'alice', status: 'accepted' },
        ],
        incoming: [],
        outgoing: [],
      },
    });
    const out = await friends.listFriends();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/friends');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(42);
    expect(out[0].login).toBe('alice');
  });

  test('listPendingRequests reads `incoming`, not `pending_requests`', async () => {
    // Old broken contract had `pending_requests` — verify the new
    // adapter ignores it and uses `incoming`.
    mockedGet.mockResolvedValueOnce({
      data: {
        friends: [],
        incoming: [
          {
            friendship_id: 5,
            mobile_user_id: 99,
            login: 'bob',
            status: 'pending',
            requested_by_mobile_user_id: 99,
            created_at: '2026-05-12T10:00:00Z',
          },
        ],
        outgoing: [],
      },
    });
    const out = await friends.listPendingRequests();
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(5); // friendship_id
    expect(out[0].from_user.id).toBe(99);
    expect(out[0].from_user.login).toBe('bob');
  });

  test('searchFriends reads `items`, not `users`', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        items: [
          { mobile_user_id: 7, login: 'charlie', first_name: 'C', last_name: null },
        ],
      },
    });
    const out = await friends.searchFriends('charlie');
    expect(mockedGet).toHaveBeenCalledWith('/mobile/friends/search', {
      params: { q: 'charlie' },
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(7);
    expect(out[0].login).toBe('charlie');
  });

  test('sendFriendRequest posts friend_mobile_user_id (NOT target_user_id)', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await friends.sendFriendRequest(42);
    // The BE validator rejects payloads without `friend_mobile_user_id`
    // — this assertion would have caught the old wrong field name.
    expect(mockedPost).toHaveBeenCalledWith('/mobile/friends/requests', {
      friend_mobile_user_id: 42,
    });
  });

  test('respondFriendRequest posts action to specific id', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await friends.respondFriendRequest(7, 'accept');
    expect(mockedPost).toHaveBeenCalledWith('/mobile/friends/requests/7/respond', {
      action: 'accept',
    });
  });

  test('removeFriend sends DELETE for the user id', async () => {
    mockedDelete.mockResolvedValueOnce({ data: { ok: true } });
    await friends.removeFriend(42);
    expect(mockedDelete).toHaveBeenCalledWith('/mobile/friends/42');
  });

  test('listInvites reads `incoming`, not `invites`', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        incoming: [
          {
            invite_id: 11,
            from_mobile_user_id: 5,
            from_login: 'dave',
            note: 'come play',
            created_at: '2026-05-12T11:00:00Z',
          },
        ],
        outgoing: [],
      },
    });
    const out = await friends.listInvites();
    expect(mockedGet).toHaveBeenCalledWith('/mobile/friends/invites');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(11);
    expect(out[0].from_user.id).toBe(5);
    expect(out[0].from_user.login).toBe('dave');
    expect(out[0].message).toBe('come play');
  });

  test('inviteFriend posts friend_mobile_user_id + note', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await friends.inviteFriend(42, 'hop on');
    expect(mockedPost).toHaveBeenCalledWith('/mobile/friends/invites', {
      friend_mobile_user_id: 42,
      note: 'hop on',
    });
  });

  test('inviteFriend without note sends note:null', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await friends.inviteFriend(42);
    expect(mockedPost).toHaveBeenCalledWith('/mobile/friends/invites', {
      friend_mobile_user_id: 42,
      note: null,
    });
  });

  test('respondInvite posts action to specific id', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ok: true } });
    await friends.respondInvite(11, 'reject');
    expect(mockedPost).toHaveBeenCalledWith('/mobile/friends/invites/11/respond', {
      action: 'reject',
    });
  });

  test('listFriendsAndRequests defaults to empty arrays on malformed payload', async () => {
    // Defence-in-depth: if the BE returns `null` or a non-object the
    // adapter still hands the consumer empty arrays rather than
    // crashing the caller's `.map(...)`.
    mockedGet.mockResolvedValueOnce({ data: null as never });
    const out = await friends.listFriendsAndRequests();
    expect(out.friends).toEqual([]);
    expect(out.pending).toEqual([]);
  });
});
