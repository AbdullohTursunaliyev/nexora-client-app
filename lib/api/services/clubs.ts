import { apiGet, apiPost, apiDelete } from '../client';
import type { ApiResource, ClubPreview } from '../types';

interface JoinClubBody {
  code: string;
}

interface JoinClubResponse {
  ok: boolean;
  tenant_id: number;
  client_id?: number;
  message?: string;
}

interface ClubProfile {
  tenant_id: number;
  name: string;
  description?: string;
  rating?: number;
  reviews_count?: number;
  cover_url?: string;
  address?: string;
  phone?: string;
  open_hours?: string;
}

export interface ClubReview {
  id: number;
  client_id: number;
  client_name?: string;
  rating: number;
  atmosphere_rating?: number;
  cleanliness_rating?: number;
  technical_rating?: number;
  peripherals_rating?: number;
  /** Legacy alias kept for older app builds that pulled `staff_rating`. */
  staff_rating?: number;
  comment?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * BE response shape for `/mobile/club/reviews` (audit deep #1 fix).
 *
 * Pre-fix the FE typed this endpoint as `ClubReview[]` and called
 * `reviews.map(...)` directly — but the BE actually returns an OBJECT
 * with `{reviews, mine, can_submit, next_review_at}` keys. That
 * crashed the screen at runtime with "reviews.map is not a function".
 */
export interface ClubReviewsResponse {
  reviews: ClubReview[];
  mine: ClubReview | null;
  can_submit: boolean;
  next_review_at: string | null;
}

/**
 * Cross-tenant "my reviews" row — every review the user authored,
 * bundled with the tenant info needed to render the club label /
 * cover on each card. Distinct from `ClubReview` because the
 * single-tenant shape doesn't carry tenant info (it doesn't need
 * to — the caller already knows which tenant).
 */
export interface MyReview {
  id: number;
  tenant: {
    id: number;
    name: string;
    cover_url: string | null;
  };
  rating: number;
  atmosphere_rating: number | null;
  cleanliness_rating: number | null;
  technical_rating: number | null;
  peripherals_rating: number | null;
  comment: string;
  created_at: string;
  updated_at: string;
}

interface MyReviewsResponse {
  reviews: MyReview[];
}

interface SaveReviewBody {
  rating: number;
  atmosphere_rating?: number;
  cleanliness_rating?: number;
  technical_rating?: number;
  peripherals_rating?: number;
  /** Legacy alias preserved for back-compat. */
  staff_rating?: number;
  comment?: string;
}

/**
 * Klub kodi bilan qo'shilish.
 *
 * The BE requires BOTH a `code` and a `password` — pre-fix this
 * service only sent `{code}` so every join attempt 422'd with
 * "The password field is required". Per-club passwords are by
 * design: each Client row (one per tenant per user) carries its
 * own credential so a user can have different passwords across
 * clubs. Min 8 chars enforced server-side; we surface that to the
 * UI via the form-level validator (see club-join.tsx).
 *
 * Empty / shorter passwords are NOT silently accepted — the BE
 * is the source of truth; the FE pre-check on length saves a
 * round-trip but the server is authoritative.
 */
export async function joinByCode(
  code: string,
  password: string,
): Promise<JoinClubResponse> {
  const res = await apiPost<ApiResource<JoinClubResponse>>('/mobile/club/join', {
    code,
    password,
  });
  return res.data;
}

/** Klub preview (qo'shilishdan oldin) */
export async function previewClub(tenantId: number): Promise<ClubPreview> {
  const res = await apiGet<ApiResource<ClubPreview>>(`/mobile/club/preview/${tenantId}`);
  return res.data;
}

/**
 * Klubdan chiqish (DELETE /mobile/club/leave/{tenantId}).
 *
 * The BE refuses (422) if there's an active session on the user's
 * PC for this tenant — the operator has to close it first so
 * billing isn't orphaned. Other side effects:
 *   - Existing balance is FORFEITED (no refund on leave)
 *   - Bookings cascade-delete
 *   - Session history / reviews stay (audit trail)
 *
 * Returns `{ok}` on success; caller is expected to refresh the
 * AuthProvider's clubs list afterwards so the leaving club drops
 * out of the local membership state.
 */
export async function leaveClub(tenantId: number): Promise<{ ok: boolean }> {
  const res = await apiDelete<ApiResource<{ ok: boolean }>>(
    `/mobile/club/leave/${tenantId}`,
  );
  return res.data;
}

/** Joriy klub profili (client.auth) */
export async function getClubProfile(): Promise<ClubProfile> {
  const res = await apiGet<ApiResource<ClubProfile>>('/mobile/club/profile');
  return res.data;
}

/**
 * Cross-tenant "my reviews" — every review the caller has authored
 * across every club they're a Client of. Sorted newest-first by
 * the BE. Used by the profile-menu "Sharhlar" surface.
 *
 * Pre-fix the profile menu "Reviews" entry pointed at
 * `/club-reviews-list` with NO clubId, which silently fell through
 * to the current-tenant review feed — strangers' reviews of the
 * user's active club. That confused users who expected to see
 * THEIR OWN writeups. This endpoint fills that gap with a
 * dedicated cross-tenant list.
 */
export async function getMyReviews(): Promise<MyReview[]> {
  const res = await apiGet<ApiResource<MyReviewsResponse>>('/mobile/auth/reviews');
  return Array.isArray(res.data?.reviews) ? res.data.reviews : [];
}

/**
 * Public reviews for ANY tenant — works without being a client of
 * the target tenant. Returns the same {reviews, mine, can_submit,
 * next_review_at} shape as `getClubReviewsResponse` BUT with
 * `mine: null` and `can_submit: false` baked in by the BE, since
 * the reader has no write ability for a club they're not joined to.
 *
 * The FE branches between this and `getClubReviewsResponse` based
 * on whether `currentTenantId === Number(clubId)`. When they match,
 * we use the client-auth endpoint so the user gets their own mine
 * + can_submit flags; otherwise we use this one.
 */
export async function getPublicClubReviews(
  tenantId: number,
): Promise<ClubReviewsResponse> {
  const res = await apiGet<ApiResource<ClubReviewsResponse>>(
    `/mobile/clubs/${tenantId}/reviews`,
  );
  const raw = res.data as unknown;
  if (Array.isArray(raw)) {
    // Defence-in-depth: same fallback as getClubReviewsResponse for a
    // stray bare-array response from an older BE build.
    return {
      reviews: raw as ClubReview[],
      mine: null,
      can_submit: false,
      next_review_at: null,
    };
  }
  const obj = raw as Partial<ClubReviewsResponse>;
  return {
    reviews: Array.isArray(obj?.reviews) ? obj.reviews : [],
    mine: null,
    can_submit: false,
    next_review_at: null,
  };
}

/** Klub sharhlari (client.auth) — to'liq javob {reviews, mine, can_submit, next_review_at}. */
export async function getClubReviewsResponse(): Promise<ClubReviewsResponse> {
  const res = await apiGet<ApiResource<ClubReviewsResponse>>('/mobile/club/reviews');
  // Defence-in-depth: if the BE shape drifts back to a bare array (older
  // server build), still hand the consumer a stable object — better than
  // crashing the screen.
  const raw = res.data as unknown;
  if (Array.isArray(raw)) {
    return {
      reviews: raw as ClubReview[],
      mine: null,
      can_submit: true,
      next_review_at: null,
    };
  }
  const obj = raw as Partial<ClubReviewsResponse>;
  return {
    reviews: Array.isArray(obj?.reviews) ? obj.reviews : [],
    mine: obj?.mine ?? null,
    can_submit: obj?.can_submit ?? true,
    next_review_at: obj?.next_review_at ?? null,
  };
}

/**
 * Backwards-compatible alias — returns just the `reviews` array so
 * older call sites (e.g. club-details preview cards) keep working
 * without code changes. New screens prefer `getClubReviewsResponse`
 * to access `mine` + `can_submit`.
 */
export async function getClubReviews(): Promise<ClubReview[]> {
  const data = await getClubReviewsResponse();
  return data.reviews;
}

/** Sharh yozish (client.auth) */
export async function saveClubReview(body: SaveReviewBody): Promise<ClubReview> {
  const res = await apiPost<ApiResource<ClubReview>>('/mobile/club/reviews', body);
  return res.data;
}
