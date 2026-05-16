import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { tokens, authEvents } from '../lib/api/client';
import { STORAGE_KEYS } from '../lib/api/config';
import * as authApi from '../lib/api/services/auth';
import * as phoneAuthApi from '../lib/api/services/phoneAuth';
import type { MobileUser, ClubMembership } from '../lib/api/types';

interface AuthState {
  user: MobileUser | null;
  clubs: ClubMembership[];
  currentTenantId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  /**
   * Step 1 of phone auth: ask the BE to issue a code for this phone.
   * The response carries `dev_code` while the SMS gateway is pending.
   */
  requestPhoneCode: (phone: string) => Promise<phoneAuthApi.RequestCodeResponse>;
  /**
   * Step 2 of phone auth: submit the 4-digit code. Returns one of two
   * outcomes — login (phone matched a user) or needs_registration
   * (phone is new). On the login outcome the provider has already
   * persisted the new mobile_token + clubs and selected a tenant.
   */
  verifyPhoneCode: (
    phone: string,
    code: string,
  ) => Promise<phoneAuthApi.VerifyCodeResponse>;
  /**
   * Step 3 of phone auth (only after verifyPhoneCode returned
   * needs_registration): trade the signup_token + name for a fresh
   * account. Provider then runs the same post-login wiring as
   * verifyPhoneCode.
   */
  registerWithPhone: (
    signupToken: string,
    firstName?: string | null,
    lastName?: string | null,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  switchClub: (tenantId: number) => Promise<void>;
  saveProfile: (body: { first_name?: string | null; last_name?: string | null; phone?: string | null; avatar_url?: string | null }) => Promise<void>;
}

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

interface ProviderProps {
  children: React.ReactNode;
}

/**
 * Sentinel prefix for any legacy demo tokens that may still live in the
 * device's secure storage from old dev builds. Demo mode is no longer
 * shipped, so on boot we strip these so they can't leak fake state into
 * the real session.
 */
const LEGACY_DEMO_PREFIX = 'demo_';

export default function AuthProvider({ children }: ProviderProps) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [clubs, setClubs] = useState<ClubMembership[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Track the mobile token in React state so consumers re-render when it
  // changes. Previously `isAuthenticated` read from the singleton
  // synchronously, missing token mutations and producing stale routing.
  const [mobileToken, setMobileTokenState] = useState<string | null>(null);

  const persistUser = async (next: MobileUser | null) => {
    setUser(next);
    if (next) await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next));
    else await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  };

  /**
   * Hard reset — drop tokens + state. Called on explicit logout AND on
   * the auth:unauthorized event (token expired server-side).
   *
   * AsyncStorage wipe includes EVERY user-scoped key, not just the
   * auth identity rows. Pre-fix this only cleared `USER` +
   * `CURRENT_TENANT`, which let the next user on the same device see
   * the previous user's favourites, wallet-selected club, discover
   * filters, notification preferences, etc. — each lived under its
   * own device-wide key (`@nexora/favorite-clubs`,
   * `@nexora/wallet-selected-club`, `@nexora/discover-filter`,
   * `@nexora/discover-advanced`, `prefs.notifications`,
   * `nexora.profile.soonCollapsed`) and was never scoped per user.
   * Wiping them on logout / unauthorized prevents the cross-user
   * leak that surfaced during early test-account swaps (e.g. logging
   * in as 'abl' showed favourites saved while logged in as another
   * tester earlier).
   *
   * Singletons (favorites + selected-zone) also subscribe to
   * `auth:logout` / `auth:unauthorized` directly so their in-memory
   * Maps clear synchronously. Per-component hooks
   * (useSelectedClub / useDiscoverFilters / useNotificationPrefs)
   * read AsyncStorage on mount, so wiping the storage rows here is
   * sufficient — the values they already have in component state get
   * reset on next mount.
   *
   * Locale + onboarding-seen are NOT wiped — those are device-level
   * preferences (the user picked their language, they've seen the
   * onboarding) that survive account switches.
   *
   * Also emits `auth:logout` so service-layer caches (pcs catalog,
   * notifications unread singleton) can wipe themselves. Pre-fix
   * only the 401 path invalidated caches; an explicit logout left
   * them warm, so a fresh login as a different user could read the
   * previous user's data from the still-valid 30s TTL window.
   */
  const resetAuth = useCallback(async () => {
    await tokens.clear();
    setMobileTokenState(null);
    setUser(null);
    setClubs([]);
    setCurrentTenantId(null);
    await AsyncStorage.multiRemove([
      // Auth identity (always cleared)
      STORAGE_KEYS.USER,
      STORAGE_KEYS.CURRENT_TENANT,
      // User-scoped feature state — wiped to prevent cross-user leaks
      STORAGE_KEYS.FAVORITE_CLUBS,
      STORAGE_KEYS.WALLET_SELECTED_CLUB,
      STORAGE_KEYS.SELECTED_ZONE,
      STORAGE_KEYS.DISCOVER_FILTER,
      STORAGE_KEYS.DISCOVER_ADVANCED,
      STORAGE_KEYS.NOTIFICATION_PREFS,
      STORAGE_KEYS.PROFILE_SOON_COLLAPSED,
      // Locale + ONBOARDING_SEEN intentionally KEPT (device-level prefs)
    ]);
    authEvents.emit('auth:logout');
  }, []);

  /**
   * Pick a tenant for the current session and fetch a per-tenant
   * `client_token` for it. Used after login/register/boot to make sure
   * tenant-scoped routes (`/mobile/pcs`, `/mobile/wallet/*`,
   * `/mobile/tournaments`, …) have a token to attach.
   *
   * Why this needs to happen automatically: the FE picks `client_token`
   * over `mobile_token` for any URL in `CLIENT_AUTH_PREFIXES` (see
   * `lib/api/client.ts`). If the user has no `client_token` yet, those
   * requests go out without an Authorization header and the server
   * 401's — which `auth:unauthorized` then turns into a forced logout.
   * That was logging users out the moment they navigated past a
   * tenant-scoped tab. Auto-resolving a tenant on the auth happy paths
   * keeps the client_token in sync with whichever club the user has
   * (or just remembered).
   *
   * Strategy:
   *   1. If a stored `currentTenantId` matches a club in the user's
   *      list, switch to it (resume their previous selection).
   *   2. Otherwise pick `clubs[0]` so single-club users get a working
   *      session without ever seeing the "pick a club" screen.
   *   3. On error we surface nothing — the user simply lands on the
   *      tabs and the per-tab fetches will quietly fail (they retry
   *      on focus). Better than blocking login on a 5xx.
   */
  const ensureTenantSession = useCallback(
    async (clubs: ClubMembership[], preferredTenantId: number | null): Promise<void> => {
      if (clubs.length === 0) return;
      const preferred =
        preferredTenantId != null && clubs.some((c) => c.tenant_id === preferredTenantId)
          ? preferredTenantId
          : clubs[0].tenant_id;
      try {
        await authApi.switchClub(preferred);
        setCurrentTenantId(preferred);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, String(preferred));
      } catch {
        // Quietly skip — request interceptor will continue trying with
        // mobile_token and the user can retry from clubs-switch.
      }
    },
    [],
  );

  /** Boot: AsyncStorage dan tokenlarni va userni o'qiymiz */
  useEffect(() => {
    (async () => {
      try {
        await tokens.loadFromStorage();

        const [storedUser, storedTenant] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.CURRENT_TENANT),
        ]);

        if (storedUser) setUser(JSON.parse(storedUser));
        const storedTenantId = storedTenant ? Number(storedTenant) : null;
        if (storedTenantId) setCurrentTenantId(storedTenantId);

        const currentToken = tokens.getMobileToken();

        // Demo mode was removed; if a release build inherits a stale demo
        // token from an old dev install the request interceptor would
        // attach `Bearer demo_token_for_ui_testing` to every API call —
        // endless 401 noise + a fake user staring back at the real owner.
        // Strip it on boot regardless of build flavour.
        if (currentToken?.startsWith(LEGACY_DEMO_PREFIX)) {
          await tokens.clear();
          await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.CURRENT_TENANT]);
          setUser(null);
          setMobileTokenState(null);
          return;
        }

        setMobileTokenState(currentToken);

        if (currentToken) {
          try {
            const me = await authApi.me();
            setUser(me.user);
            setClubs(me.clubs);
            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(me.user));
            // Always refresh the per-tenant session on boot. Previously
            // we gated on `!hasClientToken || storedTenantId != null`,
            // which silently skipped the path where a stale client_token
            // survived a partial reset (no stored tenant id but a token
            // still in keystore). The user landed on home with
            // `currentTenantId === null`, so every tenant-scoped fetch
            // — promotions, rank, balance — read the FE fallback and
            // looked empty. One extra POST /auth/switch-club on each
            // cold boot is a worthwhile trade for self-healing state.
            await ensureTenantSession(me.clubs, storedTenantId);
          } catch {
            // 401 / network error — drop the token so the boot doesn't
            // leave the app in a half-logged-in state.
            await resetAuth();
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [resetAuth, ensureTenantSession]);

  /**
   * Global self-healing watchdog. If the user has joined clubs but
   * for some reason no tenant is selected (stale storage from an old
   * build, a partial reset, a failed switchClub mid-login), pick
   * `clubs[0]` and run a fresh switchClub. Belt-and-braces alongside
   * the boot path's ensureTenantSession — that one only fires once
   * per cold start, but clubs / user state can change later (e.g.
   * a refreshMe call) without going through boot. A ref gate keeps
   * this from firing in a loop while the switchClub request is in
   * flight.
   */
  const autoSwitchInFlightRef = useRef(false);
  useEffect(() => {
    if (autoSwitchInFlightRef.current) return;
    if (!user || currentTenantId != null || clubs.length === 0) return;
    autoSwitchInFlightRef.current = true;
    void (async () => {
      try {
        await authApi.switchClub(clubs[0].tenant_id);
        setCurrentTenantId(clubs[0].tenant_id);
        await AsyncStorage.setItem(
          STORAGE_KEYS.CURRENT_TENANT,
          String(clubs[0].tenant_id),
        );
      } catch {
        // The response interceptor handles 401s; quiet here so we
        // don't flood the console. The next clubs / user change will
        // re-trigger this effect and try again.
      } finally {
        autoSwitchInFlightRef.current = false;
      }
    })();
  }, [user, currentTenantId, clubs]);

  /**
   * Subscribe to 401s from the axios interceptor. When the server says
   * "your token is dead" we tear down auth and bounce to /login. This
   * replaces the `// TODO` left in client.ts.
   */
  useEffect(() => {
    const unsubscribe = authEvents.on('auth:unauthorized', () => {
      // Don't run during initial boot — boot already calls resetAuth on
      // me() failure and a double redirect can confuse the router.
      if (isLoading) return;

      void (async () => {
        await resetAuth();
        try {
          router.replace('/login');
        } catch {
          // router not mounted yet (e.g. very early in app lifecycle).
        }
      })();
    });
    return unsubscribe;
  }, [isLoading, resetAuth]);

  /**
   * Cross-user state wipe — fired from `login` / `register` when the
   * BE returns a user_id that differs from the one currently in memory
   * OR in AsyncStorage.
   *
   * Why this exists on top of `resetAuth`:
   *   `resetAuth` fires on the logout button, on 401 auth:unauthorized,
   *   and on boot when `me()` rejects — every "intentional or detected"
   *   user exit. But there's a residual path that bypasses all three:
   *     1. User A is logged in, taps "Logout"
   *     2. resetAuth fires `auth:logout` → favorites/zone singletons
   *        wipe their in-memory state IF their listener is registered
   *     3. But if `useFavoriteClubs` was never imported in the session
   *        (user A never tapped a club card or visited /favorites),
   *        the module hasn't loaded → no listener → in-memory Map
   *        stays empty (lucky) but AsyncStorage is wiped by resetAuth's
   *        multiRemove (still safe).
   *     4. User B logs in → useFavoriteClubs first mount → hydrate()
   *        reads the (now-empty) AsyncStorage → fine.
   *
   *   The leak shape the report described ("abl sees previous user's
   *   clubs in wishlist") requires a path where AsyncStorage was NOT
   *   wiped. The only known shape: user A force-quit the app mid-
   *   session (auth:logout never fired) AND user B opened the app
   *   while user A's mobile_token was already invalidated server-side
   *   (so `me()` on boot would 401)... but boot's `resetAuth` should
   *   catch that path too via the catch block.
   *
   *   That leaves: belt-and-suspenders for the unknown unknown. We do
   *   a multiRemove of the user-scoped keys when login() detects a
   *   user_id flip, so even if resetAuth was skipped somehow the new
   *   user starts on a clean slate. Authentication isn't a free
   *   operation anyway — one extra storage write per login is cheap.
   */
  const wipeIfCrossUser = useCallback(async (incomingUserId: number) => {
    let previousUserId: number | null = user?.id ?? null;
    if (previousUserId == null) {
      // user state is null but storage might still hold the previous
      // identity if a force-quit interrupted the resetAuth multiRemove.
      // Read the row directly so the comparison is honest.
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        if (stored) {
          const parsed = JSON.parse(stored) as { id?: unknown };
          if (typeof parsed?.id === 'number') previousUserId = parsed.id;
        }
      } catch {
        // Storage unavailable / row corrupt — skip comparison and treat
        // this as a fresh login (no wipe). Worst case the new user
        // starts with stale state, same as today.
      }
    }
    if (previousUserId == null || previousUserId === incomingUserId) return;

    // Different identity → fire the bus AND multiRemove the same keys
    // resetAuth touches. Singletons that attached their listener pick
    // up the bus event; ones that didn't yet (race) pick up the empty
    // AsyncStorage on their next hydrate() call.
    authEvents.emit('auth:logout');
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.FAVORITE_CLUBS,
      STORAGE_KEYS.WALLET_SELECTED_CLUB,
      STORAGE_KEYS.SELECTED_ZONE,
      STORAGE_KEYS.DISCOVER_FILTER,
      STORAGE_KEYS.DISCOVER_ADVANCED,
      STORAGE_KEYS.NOTIFICATION_PREFS,
      STORAGE_KEYS.PROFILE_SOON_COLLAPSED,
      // CURRENT_TENANT also gets wiped — the previous user's selected
      // tenant id is meaningless for the new identity (memberships
      // are scoped by mobile_user_id) and could 401 the first request.
      STORAGE_KEYS.CURRENT_TENANT,
    ]);
  }, [user]);

  /**
   * Post-login wiring shared by every phone-auth path that actually
   * lands a session (verify-code happy path, verify-code auto-onboard,
   * and the post-register path). Pre-fix this was duplicated across
   * the legacy `login` and `register` callbacks; keeping it in one
   * place means future identity flows (social sign-in, SSO) only
   * need to call `applyLoginPayload(...)` after they obtain the
   * standard MobileAuthResponse shape.
   */
  const applyLoginPayload = useCallback(
    async (payload: { user: MobileUser; clubs: ClubMembership[] }) => {
      await wipeIfCrossUser(payload.user.id);
      await persistUser(payload.user);
      setClubs(payload.clubs);
      setMobileTokenState(tokens.getMobileToken());
      // Auto-attach to a tenant so the user can navigate to wallet /
      // pcs / tournaments etc. without the request interceptor
      // 401-then-logging-them-out. See ensureTenantSession docblock.
      await ensureTenantSession(payload.clubs, currentTenantId);
    },
    [wipeIfCrossUser, ensureTenantSession, currentTenantId],
  );

  const requestPhoneCode = useCallback(
    (phone: string) => phoneAuthApi.requestCode(phone),
    [],
  );

  const verifyPhoneCode = useCallback(
    async (phone: string, code: string) => {
      const res = await phoneAuthApi.verifyCode(phone, code);
      if (!phoneAuthApi.needsRegistration(res)) {
        await applyLoginPayload(res);
      }
      return res;
    },
    [applyLoginPayload],
  );

  const registerWithPhone = useCallback(
    async (signupToken: string, firstName?: string | null, lastName?: string | null) => {
      const res = await phoneAuthApi.register(signupToken, firstName, lastName);
      await applyLoginPayload(res);
    },
    [applyLoginPayload],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    await resetAuth();
  }, [resetAuth]);

  const refreshMe = useCallback(async () => {
    const me = await authApi.me();
    await persistUser(me.user);
    setClubs(me.clubs);
  }, []);

  const switchClub = useCallback(async (tenantId: number) => {
    await authApi.switchClub(tenantId);
    setCurrentTenantId(tenantId);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, String(tenantId));
    // Tenant change ⇒ different PCs / bookings / promotions /
    // discover `joined` flags. Invalidate service caches so the next
    // list call hits the new tenant's data instead of returning the
    // previous tenant's rows from the 30s TTL window. Pre-fix users
    // who switched clubs mid-session could see the OLD club's data
    // for up to 30s, which masked real seat availability and made
    // the "joined" badges flicker between two tenants.
    authEvents.emit('auth:logout');
  }, []);

  const saveProfile = useCallback(async (body: { first_name?: string | null; last_name?: string | null; phone?: string | null; avatar_url?: string | null }) => {
    const res = await authApi.saveProfile(body);
    if (res.user) await persistUser(res.user);
  }, []);

  // Memoised so consumers using `[t, ...auth]` deps don't re-render on
  // every parent render.
  const value: AuthContextValue = useMemo(
    () => ({
      user,
      clubs,
      currentTenantId,
      isAuthenticated: !!user && !!mobileToken,
      isLoading,
      requestPhoneCode,
      verifyPhoneCode,
      registerWithPhone,
      logout,
      refreshMe,
      switchClub,
      saveProfile,
    }),
    [user, clubs, currentTenantId, mobileToken, isLoading, requestPhoneCode, verifyPhoneCode, registerWithPhone, logout, refreshMe, switchClub, saveProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
