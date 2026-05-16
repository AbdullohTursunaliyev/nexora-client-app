import { apiPost, tokens } from '../client';
import type { ApiResource, MobileAuthResponse } from '../types';

/**
 * Phone + OTP authentication service.
 *
 * Three-endpoint flow (mirrors BE MobilePhoneAuthController):
 *
 *   1. `requestCode(phone)` — kicks off an OTP for that phone.
 *      Returns `dev_code` while the SMS gateway is still pending so
 *      the field team can complete the loop without a provider
 *      account. Drop the `dev_code` surface from the UI once SMS
 *      lands.
 *
 *   2. `verifyCode(phone, code)` — three outcomes:
 *      • Phone has a mobile_user → login payload with token + clubs
 *      • Phone has only client memberships → BE auto-onboards a
 *        mobile_user shell and returns the same login payload (clubs
 *        populated via phone match across tenants)
 *      • Phone is brand-new → response carries `needs_registration:
 *        true` and a `signup_token` to carry into /register
 *
 *   3. `register(signupToken, firstName, lastName)` — finalises a
 *      fresh account. Returns the same login payload shape, with
 *      clubs[] empty (new user, no club memberships yet).
 *
 * Token persistence: on every successful login/register the
 * `mobile_token` is written to expo-secure-store via the
 * `tokens.setMobileToken` helper. Downstream `client.ts` request
 * interceptor reads it back per-request — no module-level cache.
 */

/** Response from /mobile/auth/phone/request-code */
export interface RequestCodeResponse {
  /** Server-normalised phone (digits only, +country code if known). */
  phone: string;
  /** ISO timestamp when the code expires. */
  expires_at: string;
  /** Seconds the code stays valid — for the FE resend countdown. */
  ttl_seconds: number;
  /**
   * Dev-only echo of the plain 4-digit code. Surfaced in the UI as
   * a "Dev mode" badge until the SMS gateway is wired up so the
   * field team can finish booking flows without a provider account.
   * Will be removed once the SMS path goes live.
   */
  dev_code?: string;
}

/** Response from /mobile/auth/phone/verify-code (login outcome). */
export interface VerifyCodeLoginResponse extends MobileAuthResponse {
  /** Discriminator — always absent or false for the login outcome. */
  needs_registration?: false;
}

/** Response from /mobile/auth/phone/verify-code (new-user outcome). */
export interface VerifyCodeRegisterResponse {
  needs_registration: true;
  /** Short-lived encrypted token the FE carries into /register. */
  signup_token: string;
  /** Server-normalised phone so the registration screen can show it. */
  phone: string;
}

export type VerifyCodeResponse =
  | VerifyCodeLoginResponse
  | VerifyCodeRegisterResponse;

/**
 * Type guard: did `/verify-code` return a brand-new-user response
 * that the FE must follow up on with /register? Pre-fix this was
 * inlined as a property check at every consumer; centralised here
 * so the discriminator change is a single edit if BE evolves.
 */
export function needsRegistration(
  res: VerifyCodeResponse,
): res is VerifyCodeRegisterResponse {
  return (res as VerifyCodeRegisterResponse).needs_registration === true;
}

/** Step 1 — ask the BE to issue a code for this phone. */
export async function requestCode(phone: string): Promise<RequestCodeResponse> {
  const res = await apiPost<ApiResource<RequestCodeResponse>>(
    '/mobile/auth/phone/request-code',
    { phone },
  );
  return res.data;
}

/**
 * Step 2 — verify the code. Saves the mobile_token automatically
 * when the BE returns a login payload (existing user / auto-
 * onboarded user). For the `needs_registration` outcome the caller
 * routes the user to the registration screen with the signup_token.
 */
export async function verifyCode(
  phone: string,
  code: string,
): Promise<VerifyCodeResponse> {
  const res = await apiPost<ApiResource<VerifyCodeResponse>>(
    '/mobile/auth/phone/verify-code',
    { phone, code },
  );
  const data = res.data;
  if (!needsRegistration(data)) {
    await tokens.setMobileToken(data.token);
  }
  return data;
}

/**
 * Step 3 — finalise registration. Trades the signup_token (from
 * verify-code) plus the user's name for a real mobile_token.
 */
export async function register(
  signupToken: string,
  firstName?: string | null,
  lastName?: string | null,
): Promise<MobileAuthResponse> {
  const res = await apiPost<ApiResource<MobileAuthResponse>>(
    '/mobile/auth/phone/register',
    {
      signup_token: signupToken,
      first_name: firstName ?? null,
      last_name: lastName ?? null,
    },
  );
  await tokens.setMobileToken(res.data.token);
  return res.data;
}
