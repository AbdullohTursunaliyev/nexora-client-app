import { apiGet, apiPost, tokens } from '../client';
import type {
  ApiResource,
  MobileUser,
  ClubMembership,
  SaveProfileBody,
  SwitchClubResponse,
} from '../types';

/**
 * Mobile Authentication Service — post-login operations only.
 *
 * The login/register entry points moved to `phoneAuth.ts` when the
 * mobile app switched to phone + 4-digit OTP auth. The endpoints
 * `/mobile/auth/login` and `/mobile/auth/register` are still mounted
 * on the BE for older app builds in the field but the FE no longer
 * calls them — all new sessions go through phone-auth. This file
 * keeps the calls every authenticated session still uses (`me`,
 * `profile`, `switchClub`, `logout`, etc.).
 */

interface MeResponse {
  user: MobileUser;
  clubs: ClubMembership[];
}

interface SaveProfileResponse {
  ok: boolean;
  user: MobileUser;
}

interface UploadAvatarResponse {
  ok?: boolean;
  user?: MobileUser;
  url?: string;
}

/** Joriy foydalanuvchi ma'lumotlari */
export async function me(): Promise<MeResponse> {
  const res = await apiGet<ApiResource<MeResponse>>('/mobile/auth/me');
  return res.data;
}

/** Profile (faqat user) */
export async function getProfile(): Promise<{ user: MobileUser }> {
  const res = await apiGet<ApiResource<{ user: MobileUser }>>('/mobile/auth/profile');
  return res.data;
}

/** Profilni saqlash (first/last name, avatar URL) */
export async function saveProfile(body: SaveProfileBody): Promise<SaveProfileResponse> {
  const res = await apiPost<ApiResource<SaveProfileResponse>>('/mobile/auth/profile', body);
  return res.data;
}

/** Avatar yuklash (multipart) — file: { uri, name, type } */
export async function uploadAvatar(file: { uri: string; name: string; type: string }): Promise<UploadAvatarResponse> {
  const formData = new FormData();
  // React Native FormData file
  // @ts-ignore — RN-specific shape
  formData.append('avatar', { uri: file.uri, name: file.name, type: file.type });

  const res = await apiPost<ApiResource<UploadAvatarResponse>>('/mobile/auth/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * Switch into a tenant and persist the per-tenant bearer token.
 *
 * Wire contract: BE returns `{ club_token, tenant, client }`. The FE
 * keeps its internal "client_token" naming everywhere else, but here
 * we must read the BE-side `club_token` field. Pre-fix this read
 * `res.data.client_token` (which doesn't exist) and silently called
 * `setClientToken(undefined)` — the secure-storage wipe branch — so
 * every switchClub call destroyed the token it was supposed to set.
 * Visible symptom: home tab promotions / wallet / tournaments rendered
 * empty because the request interceptor had no client_token to attach
 * and the 401 fell through Category 1 (no Auth header sent).
 */
export async function switchClub(tenantId: number): Promise<SwitchClubResponse> {
  const res = await apiPost<ApiResource<SwitchClubResponse>>('/mobile/auth/switch-club', {
    tenant_id: tenantId,
  });
  await tokens.setClientToken(res.data.club_token);
  return res.data;
}

/** Logout (token serverdan ham o'chiriladi) */
export async function logout(): Promise<void> {
  try {
    await apiPost('/mobile/auth/logout');
  } catch {
    // server javobsiz bo'lsa ham local tokenlarni tozalaymiz
  }
  await tokens.clear();
}
