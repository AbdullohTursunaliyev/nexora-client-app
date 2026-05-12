/** API Response wrappers (Laravel JsonResource standart) */
export interface ApiResource<T> {
  data: T;
}

export interface ApiPagination<T> {
  data: T[];
  meta?: {
    current_page: number;
    total: number;
    per_page: number;
    last_page?: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

/** Mobile User (auth/me, login response) */
export interface MobileUser {
  id: number;
  login: string;
  first_name?: string | null;
  last_name?: string | null;
  /**
   * Contact phone number (E.164-ish, but we don't enforce a strict
   * format on the FE because operators run national-only callbacks
   * in practice). Optional — BE returns null when the user hasn't
   * filled it in via profile-edit.
   */
  phone?: string | null;
  avatar_url?: string | null;
  created_at?: string;
}

/** Club (tenant) — user is member of */
export interface ClubMembership {
  tenant_id: number;
  tenant_name: string;
  client_id?: number;
  /** Per-tenant login string (Client.login) — same as MobileUser.login. */
  login?: string;
  status?: string;
  /** Sum balance, may be 0 but never null per BE shape. */
  balance: number;
  bonus: number;
  club_logo?: string | null;
  club_location?: string | null;
  pcs_total?: number;
  zones_total?: number;
  reviews_count?: number;
  avg_rating?: number;
}

/** Login/Register response */
export interface MobileAuthResponse {
  token: string;
  user: MobileUser;
  clubs: ClubMembership[];
}

/** Switch club response */
export interface SwitchClubResponse {
  /**
   * Per-tenant bearer token. The BE response wire name is `club_token`
   * (see MobileAuthService::switchClub). We store it under "client_token"
   * in secure storage everywhere else in the FE because all the other
   * scaffolding — `CLIENT_AUTH_PREFIXES`, the `client.auth` middleware,
   * STORAGE_KEYS.CLIENT_TOKEN — uses the "client" framing. The earlier
   * version of this interface had `client_token` here, so the service
   * happily read `undefined` from every response and silently wiped the
   * stored token via `setClientToken(undefined)`. Promotions / wallet /
   * tournaments quietly 401-without-Authorization as a result, and the
   * empty-promotions screen never went away even on a fresh login.
   */
  club_token: string;
  tenant: {
    id: number;
    name: string;
  };
  client: {
    id: number;
    balance: number;
    bonus: number;
  };
}

/** Profile save body */
export interface SaveProfileBody {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

/** Login body */
export interface LoginBody {
  login: string;
  password: string;
}

/** Register body */
export interface RegisterBody {
  login: string;
  password: string;
  password_confirmation: string;
}

/** Club preview / join */
export interface ClubPreview {
  tenant_id: number;
  name: string;
  city?: string;
  description?: string;
  rating?: number;
  cover_url?: string;
}

/** Client summary (after switching to club) */
export interface ClientRank {
  key: string;
  name: string;
  /** Hex colour string from the backend, used to tint the rank chip. */
  color: string;
  icon?: string;
  min_total_topup?: number;
  bonus_percent?: number;
}

export interface ClientSummary {
  /** Optional because /client/summary can return clients before the
   *  backend has populated their wallet rows (new joins, etc.). */
  client?: {
    id: number;
    login: string;
    balance: number;
    bonus: number;
  };
  balance?: number;
  bonus?: number;
  rank?: {
    current: ClientRank;
    next?: ClientRank;
    stats?: {
      total_topup: number;
      progress: number;
      remaining_to_next: number;
    };
  };
  active_session?: {
    id: number;
    pc_id: number;
    started_at: string;
    elapsed_seconds: number;
  } | null;
  stats?: {
    sessions_count: number;
    total_hours: number;
    total_spent: number;
  };
}

/** PC / Seat */
export interface Pc {
  id: number;
  code: string;
  zone_id?: number | null;
  zone_name?: string;
  status: 'free' | 'busy' | 'offline' | 'reserved' | string;
  ip_address?: string;
  price_per_hour?: number;
}
