import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_TIMEOUT, STORAGE_KEYS } from './config';
import {
  migrateLegacyKeys,
  secureGet,
  secureMultiRemove,
  secureRemove,
  secureSet,
} from './secureStorage';
import { getCurrentLocale } from '../i18n/currentLocale';
import { translations } from '../i18n/translations';
import type { ApiError } from './types';

/**
 * Lightweight pub-sub for auth events. The response interceptor below
 * publishes `auth:unauthorized` on 401 so AuthProvider can reset state
 * (clear tokens, drop the user, redirect to login). We avoid pulling in a
 * full event-emitter dep — a Set of callbacks is enough.
 */
/**
 * Auth event names.
 *
 *   • `auth:unauthorized` — fired by the response interceptor on a
 *     401 against a mobile-scoped URL. AuthProvider catches this and
 *     hard-resets state (drops user, redirects to login).
 *   • `auth:logout` — fired by AuthProvider's own `resetAuth` on
 *     explicit user-initiated logout AND on the 401-driven reset.
 *     Service-layer caches (pcs catalog, etc.) subscribe so a fresh
 *     login as a different user never reads the previous user's
 *     in-memory cache. Pre-fix only `auth:unauthorized` was emitted
 *     — caches stayed warm after an explicit logout, and the next
 *     user's first list call could briefly show the previous user's
 *     data until the TTL expired.
 *   • `auth:tenant-switched` — fired by AuthProvider's `switchClub`
 *     when the user changes the active club. The session (and the
 *     mobile_token) survives — only the tenant-scoped data is stale
 *     now. ONLY tenant-scoped in-memory caches (pcs catalog, discover
 *     `joined` flags) subscribe so the next list call hits the new
 *     tenant's rows instead of the previous tenant's 30s TTL window.
 *     Pre-fix `switchClub` reused `auth:logout` to flush these caches,
 *     which over-fired: device-scoped state that legitimately persists
 *     across a club switch (favourites, the booking-flow zone pick)
 *     also subscribes to `auth:logout` and got wiped on every club
 *     change. Worse, it coupled "switch club" to "logout" — the day
 *     `auth:logout` grows a "drop the token" side-effect, switching
 *     clubs would silently sign the user out. Splitting the event
 *     keeps cache-invalidation and session-teardown on separate buses.
 */
type AuthEvent = 'auth:unauthorized' | 'auth:logout' | 'auth:tenant-switched';
type AuthListener = () => void;

class AuthEventBus {
  private listeners = new Map<AuthEvent, Set<AuthListener>>();

  on(event: AuthEvent, fn: AuthListener): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(fn);
    return () => bucket?.delete(fn);
  }

  emit(event: AuthEvent): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    for (const fn of bucket) {
      try {
        fn();
      } catch {
        // never let a buggy subscriber tear down the interceptor.
      }
    }
  }
}

export const authEvents = new AuthEventBus();

/**
 * Token manager — every request picks up Authorization automatically.
 *
 * Tokens live in expo-secure-store (Keystore on Android, Keychain on iOS)
 * via the secureStorage abstraction. AsyncStorage is used as a fallback
 * for web / unsupported platforms only. On boot we migrate any legacy
 * plaintext copies that an old version of the app left behind.
 */
class TokenManager {
  private mobileToken: string | null = null;
  private clientToken: string | null = null;

  async loadFromStorage() {
    // Migrate before reading — if a legacy AsyncStorage copy exists, the
    // first run of this build moves it into SecureStore and deletes the
    // plaintext source. Subsequent boots skip the migration.
    await migrateLegacyKeys([STORAGE_KEYS.MOBILE_TOKEN, STORAGE_KEYS.CLIENT_TOKEN]);

    const [m, c] = await Promise.all([
      secureGet(STORAGE_KEYS.MOBILE_TOKEN),
      secureGet(STORAGE_KEYS.CLIENT_TOKEN),
    ]);
    this.mobileToken = m;
    this.clientToken = c;
  }

  async setMobileToken(token: string | null) {
    this.mobileToken = token;
    if (token) await secureSet(STORAGE_KEYS.MOBILE_TOKEN, token);
    else await secureRemove(STORAGE_KEYS.MOBILE_TOKEN);
  }

  async setClientToken(token: string | null) {
    // Fail loud in __DEV__ if the caller hands us `undefined`. The
    // shipped bug: `switchClub` read `res.data.client_token` from a
    // response that actually uses `club_token`, so `undefined` reached
    // this method and the `if (token)` branch silently wiped the
    // per-tenant token on every login. Surface that immediately so the
    // same typo can't ship green again.
    if (token !== null && typeof token !== 'string') {
      if (__DEV__) {
        throw new Error(
          `[NEXORA] tokens.setClientToken received ${typeof token} — pass a string or null explicitly. ` +
            'Passing undefined was masking a switchClub field-name bug; see commit history.',
        );
      }
      // In release builds we still bail rather than wipe, so a
      // mis-shaped server response doesn't quietly log the user out
      // of every tenant-scoped tab. The next legitimate switchClub
      // will set a real value.
      return;
    }
    this.clientToken = token;
    if (token) await secureSet(STORAGE_KEYS.CLIENT_TOKEN, token);
    else await secureRemove(STORAGE_KEYS.CLIENT_TOKEN);
  }

  async clear() {
    this.mobileToken = null;
    this.clientToken = null;
    await secureMultiRemove([
      STORAGE_KEYS.MOBILE_TOKEN,
      STORAGE_KEYS.CLIENT_TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.CURRENT_TENANT,
    ]);
  }

  getMobileToken(): string | null {
    return this.mobileToken;
  }
  getClientToken(): string | null {
    return this.clientToken;
  }
}

export const tokens = new TokenManager();

/** Axios instance — har bir endpoint shu orqali chaqiriladi */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

/**
 * Endpoint-prefix list for the per-tenant `client.auth` token.
 *
 * Pre-fix (FE-H11) we used a regex that didn't match `/wallet/`,
 * `/tournaments/`, `/leaderboard/`, `/bookings/`, `/services/`, or the
 * tenant-scoped `/teams/` routes — so those endpoints received the
 * mobile_token and 401'd in production. The explicit list below mirrors
 * the routes/api.php `client.auth` middleware group (last reviewed
 * 2026-05-10). When you add a new tenant-scoped endpoint, add its
 * prefix here too.
 */
const CLIENT_AUTH_PREFIXES = [
  '/mobile/client/summary',
  '/mobile/client/missions',
  '/mobile/club/profile',
  '/mobile/club/reviews',
  '/mobile/friends/invites',
  '/mobile/pcs',
  '/mobile/client/smart-queue',
  '/mobile/bookings',
  '/mobile/wallet',
  '/mobile/tournaments',
  '/mobile/leaderboard',
  '/mobile/services/',
  '/mobile/teams',
  // Added 2026-05-11: /promotions is tenant-scoped on the BE (it
  // reads `tenant_id` from the client.auth middleware). Without this
  // entry the request interceptor attaches the mobile_token, BE
  // 401's, and our response interceptor treats that as a dead mobile
  // session — bouncing the user back to /login the moment the home
  // tab tries to load promotions.
  '/mobile/promotions',
  // Added 2026-05-17: the booking-flow data sources are mounted
  // inside the `client.auth` group in routes/api.php:893-897 —
  // /mobile/packages (MobileBookingController::packages) and
  // /mobile/booking/slots (MobileBookingController::slots) both
  // need the tenant-scoped token. Pre-fix the FE sent the
  // mobile_token because they didn't match any prefix, BE 401'd,
  // and the response interceptor's "dead mobile session" path
  // logged the user out the moment they walked from seat-select to
  // time-select. Symptom: tapped a seat → logged out → had to
  // re-login → home empty until pull-to-refresh.
  '/mobile/packages',
  '/mobile/booking/slots',
  // Added 2026-05-30: mobile QR-login claim. The Shell shows a login QR
  // (`nexora://claim?cid=<uuid>`); the signed-in client scans it and
  // POSTs the claim id to bind itself to that seat's pending Shell
  // session. The bind is tenant-scoped (the BE reads `tenant_id` from
  // the `client.auth` middleware to resolve which club's Shell is
  // claiming), so it MUST carry the per-tenant client_token. Without
  // this prefix the interceptor attaches the mobile_token, the BE
  // 401's, and the response interceptor treats it as a dead mobile
  // session — bouncing the user to /login mid-scan.
  '/mobile/qr-claim',
  // Added 2026-05-30: self-service wallet top-up (Payme/Click). The
  // `/client-auth/*` routes (payment-methods, topup, topup/{order})
  // are mounted in the `client.auth` middleware group on the BE — they
  // resolve the configured PSP providers + create the pending top-up
  // order from the per-tenant `tenant_id`, so they MUST carry the
  // per-tenant client_token. Without this prefix the interceptor
  // attaches the mobile_token, the BE 401's, and the response
  // interceptor treats it as a dead mobile session — bouncing the user
  // to /login the moment they open the top-up screen.
  '/client-auth',
];

function needsClientToken(url: string): boolean {
  // Auth endpoints always use mobile_token, regardless of prefix matches.
  if (url.includes('/mobile/auth/')) return false;
  return CLIENT_AUTH_PREFIXES.some((p) => url.startsWith(p));
}

/**
 * Generate a UUIDv4 for the Idempotency-Key header.
 *
 * Why: a flaky mobile network can cut the connection mid-POST after the
 * server already wrote the row. Without an idempotency key the FE can't
 * safely retry — it might double-charge a top-up or double-book a PC.
 * The backend should de-dup by Idempotency-Key (FE-M14 follow-up).
 *
 * IMPORTANT — money/booking flows must mint the key ONCE per logical
 * operation and reuse it across retries, NOT per HTTP attempt. The
 * request interceptor below generates a fresh key only when the caller
 * hasn't supplied one (`config.headers['Idempotency-Key']`); for the
 * pay/book paths the caller (`app/payment.tsx::onConfirm`,
 * `app/qr-scan.tsx::handleScanned`) creates a single key at the start
 * of the attempt and hands it to `bookPc` / `openByQr`, so a retry or
 * a double-tap reuses the same key and the BE can de-dup. Exported for
 * those callers (and so a Jest test can assert the reuse contract).
 * Pre-fix the interceptor minted a brand-new UUID on every POST, which
 * meant the server could never recognise a retried charge as a
 * duplicate — the "we have idempotency" claim was hollow.
 */
export function generateIdempotencyKey(): string {
  // Crypto-grade UUIDs aren't available cross-platform; this is a v4
  // pattern good enough for de-dup keying (collision space ~5.3 × 10^36).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Request interceptor — Authorization + Idempotency-Key headers. */
api.interceptors.request.use(
  (config) => {
    const url = config.url ?? '';
    const token = needsClientToken(url) ? tokens.getClientToken() : tokens.getMobileToken();

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Forward the user's selected language so the backend can localize
    // validation messages, generic auth failures, etc. The MobileSupport
    // controller already inspects `Accept-Language` for its FAQ
    // resolver; future BE work can read the same header to swap
    // Laravel's translator before throwing a ValidationException.
    // Falls back to 'uz' (the default in LocaleProvider) when the
    // mirror hasn't been initialised yet — never sends an empty
    // header.
    if (!config.headers['Accept-Language']) {
      config.headers['Accept-Language'] = getCurrentLocale();
    }

    // Tag every state-changing request with an Idempotency-Key. The
    // backend can use it to de-dup retried POSTs after a flaky network
    // (FE-M14). GETs are already idempotent.
    //
    // Caller-supplied keys win: money/booking flows pass a key that
    // stays STABLE across retries + double-taps (see
    // generateIdempotencyKey docblock), so we must NOT overwrite it.
    // Only when no key was supplied do we mint a per-request fallback —
    // good enough for non-critical state changes (e.g. marking a
    // notification read) where retry de-dup isn't safety-critical.
    const method = (config.method ?? 'get').toLowerCase();
    if (
      (method === 'post' || method === 'put' || method === 'patch' || method === 'delete') &&
      !config.headers['Idempotency-Key']
    ) {
      config.headers['Idempotency-Key'] = generateIdempotencyKey();
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Response interceptor — emit auth:unauthorized only when the dead
 * token is the mobile_token (the one that proves "you are this user").
 *
 * Three 401 categories we have to distinguish:
 *
 * 1. No Authorization header sent. The FE never had a token to attach
 *    — usually a tenant-scoped route called before `switchClub`
 *    issued a client_token. That's an FE state problem; logging the
 *    user out wipes their mobile_token along with everything else and
 *    creates the "logs me out when I change pages" bug.
 *
 * 2. Authorization header sent on a *tenant-scoped* URL. The
 *    client_token is dead (expired / from another tenant), but the
 *    mobile_token still probably works. Drop the bad client_token so
 *    the next switch-club refreshes it cleanly; don't kick the user
 *    to /login.
 *
 * 3. Authorization header sent on a *mobile-scoped* URL (/auth/me,
 *    /auth/profile, /home/feed, etc.). The mobile_token is the bad
 *    one — this is a real session-expiry. Fire the event so
 *    AuthProvider resets state and redirects.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      const url = error.config?.url ?? '';
      const sentAuth =
        !!error.config?.headers?.Authorization ||
        // Axios v1 sometimes normalises to lower-case `authorization`.
        // Treat either casing as "header was attached" to make the
        // legitimate-session detection symmetric with the request
        // interceptor.
        !!(error.config?.headers as Record<string, unknown> | undefined)?.['authorization'];
      const wasTenantScoped = needsClientToken(url);

      if (sentAuth && !wasTenantScoped) {
        // Category 3 — mobile session is dead.
        authEvents.emit('auth:unauthorized');
      } else if (sentAuth && wasTenantScoped) {
        // Category 2 — only the per-tenant token is dead. Drop it
        // silently; the next `switchClub` (e.g. from the clubs picker
        // or auto-reissue at boot) will mint a fresh one.
        void tokens.setClientToken(null);
      }
      // Category 1 — silently reject; caller decides what to render.
    }
    return Promise.reject(error);
  },
);

export default api;

/**
 * Map of known backend-canonical error strings → app-side i18n keys.
 *
 * Why: parts of the backend (auth in particular) hardcode Russian
 * messages so they don't yet honour Accept-Language. Until Laravel's
 * translator is wired up there, we recognise the canonical text and
 * return whatever the user's selected locale spells the same idea as.
 * New entries land here only when we can't fix the backend in the same
 * change — track each as a "remove me when BE i18n ships" debt.
 */
type ErrorTranslationKey = 'invalidCredentials' | 'networkError' | 'timeout' | 'unknown';
const KNOWN_ERROR_PATTERNS: { match: RegExp; key: ErrorTranslationKey }[] = [
  // BE returns this verbatim from MobileAuthService::login when the
  // login or password is wrong. Localized BE message would let us
  // delete this row entirely.
  { match: /Неверный логин или пароль/i, key: 'invalidCredentials' },
];

const LOCALIZED_ERRORS: Record<ErrorTranslationKey, Record<'uz' | 'ru' | 'en', string>> = {
  invalidCredentials: {
    uz: "Login yoki parol noto'g'ri",
    ru: 'Неверный логин или пароль',
    en: 'Wrong login or password',
  },
  networkError: {
    uz: "Tarmoq xatosi. API ishlamayapti yoki URL noto'g'ri.",
    ru: 'Ошибка сети. API недоступен или URL некорректен.',
    en: 'Network error. API is unreachable or the URL is wrong.',
  },
  timeout: {
    uz: "Server javob bermadi (timeout). Internet va API URL'ni tekshiring.",
    ru: 'Сервер не ответил (таймаут). Проверьте интернет и URL API.',
    en: 'Server did not respond (timeout). Check your internet and API URL.',
  },
  unknown: {
    uz: 'Xato yuz berdi',
    ru: 'Произошла ошибка',
    en: 'Something went wrong',
  },
};

function translateError(key: ErrorTranslationKey): string {
  const locale = getCurrentLocale();
  return LOCALIZED_ERRORS[key][locale];
}

function maybeTranslate(serverMessage: string): string {
  for (const entry of KNOWN_ERROR_PATTERNS) {
    if (entry.match.test(serverMessage)) return translateError(entry.key);
  }
  return serverMessage;
}

// Suppress unused-import warning (translations is referenced for type
// inference only — the Locale union flows through it).
void translations;

/** Yordamchi: error obyektidan foydalanuvchi uchun xabar olish */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.errors) {
      // birinchi field error'ni qaytaramiz
      const first = Object.values(data.errors)[0];
      if (Array.isArray(first) && first.length) return maybeTranslate(first[0]);
    }
    if (data?.message) return maybeTranslate(data.message);
    if (error.code === 'ECONNABORTED') return translateError('timeout');
    if (error.message === 'Network Error') return translateError('networkError');
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return translateError('unknown');
}

/**
 * Wrap raw HTTP body in an `ApiResource<T>` envelope (`{ data: ... }`).
 *
 * Why: backend uses `MobilePayloadResource` which extends `BaseJsonResource`
 * with `$wrap = null`, meaning responses come back as the top-level payload
 * (e.g. `{ user: ..., clubs: [...] }`) rather than `{ data: { user, clubs } }`.
 * Every service in this app types its calls as `ApiResource<X>` and reads
 * `res.data.X`, so we normalize on the client side: if the body is already
 * `{ data: ... }` (legacy `JsonResource` or paginated response), pass it
 * through unchanged; otherwise wrap it. This keeps a single response shape
 * for callers regardless of which Resource the backend used.
 *
 * Defensive shape check (FE-H4): pre-fix `wrapEnvelope` blindly cast
 * whatever the server sent into `T`. If the backend ever returned a 200
 * with `{ status: 'error', message: 'X' }` (unlikely but seen in legacy
 * code), every service caller would silently get `undefined` from
 * `res.data.token` and crash deeper in the UI. Now we detect the common
 * error shapes and throw a real Error so the call site's try/catch
 * surfaces them as toasts.
 */
function wrapEnvelope<T>(body: unknown): T {
  if (body !== null && typeof body === 'object') {
    const obj = body as Record<string, unknown>;

    // Failure shapes: { status: 'error', message } or { error: '...' }.
    // We explicitly do NOT treat { ok: false } as an error — many of our
    // own endpoints use that as a legitimate domain-level "no-op" signal.
    const status = obj.status;
    const errorField = obj.error;
    const isErrorShape =
      status === 'error' ||
      status === 'fail' ||
      (typeof errorField === 'string' && errorField.length > 0);

    if (isErrorShape) {
      const message =
        (typeof obj.message === 'string' && obj.message) ||
        (typeof errorField === 'string' && errorField) ||
        'API returned an error';
      throw new Error(String(message));
    }

    if ('data' in obj) {
      return body as T;
    }
  }
  return { data: body } as T;
}

/** Yordamchi: GET request */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get(url, config);
  return wrapEnvelope<T>(res.data);
}

/** Yordamchi: POST request */
export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.post(url, body, config);
  return wrapEnvelope<T>(res.data);
}

/** Yordamchi: DELETE request */
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.delete(url, config);
  return wrapEnvelope<T>(res.data);
}
