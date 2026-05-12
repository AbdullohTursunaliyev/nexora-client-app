import { apiGet, apiPost } from '../client';
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

/** Klub kodi bilan qo'shilish */
export async function joinByCode(code: string): Promise<JoinClubResponse> {
  const res = await apiPost<ApiResource<JoinClubResponse>>('/mobile/club/join', { code });
  return res.data;
}

/** Klub preview (qo'shilishdan oldin) */
export async function previewClub(tenantId: number): Promise<ClubPreview> {
  const res = await apiGet<ApiResource<ClubPreview>>(`/mobile/club/preview/${tenantId}`);
  return res.data;
}

/** Joriy klub profili (client.auth) */
export async function getClubProfile(): Promise<ClubProfile> {
  const res = await apiGet<ApiResource<ClubProfile>>('/mobile/club/profile');
  return res.data;
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
