import { apiGet, apiPost, apiDelete, authEvents } from '../client';
import type { ApiResource, Pc } from '../types';

/**
 * Short-TTL cache for `/mobile/pcs`.
 *
 * Why: the booking flow (zone-select → seat-select → payment) calls
 * `listPcs()` three times within ~30 seconds. Pre-cache that was three
 * full network round-trips for identical data, sometimes returning
 * out-of-sync results when the BE's freeness state flipped between
 * fetches. With a 30s TTL the three calls collapse into one request
 * and the seat the user picked on seat-select is the same seat we
 * look up on payment.
 *
 * Invalidation:
 *   - Time-based: 30 s elapsed since last successful fetch.
 *   - Explicit: `bookPc` / `unbookPc` / `partyBook` flip a seat from
 *     free → reserved (or vice versa), so the cache MUST clear after
 *     those calls. Subsequent reads return fresh state.
 *   - Auth event: tenant switch invalidates the cache (new tenant,
 *     different PCs).
 */
const CACHE_TTL_MS = 30_000;
let cachedPcs: Pc[] | null = null;
let cachedAt = 0;
let inflight: Promise<Pc[]> | null = null;

/**
 * Drop the in-memory PC cache. Exported so tests can reset between
 * cases and so future write paths (e.g. `unbookPc` already invokes
 * this, club-switch should too) can force the next read to be fresh.
 */
export function invalidatePcsCache(): void {
  cachedPcs = null;
  cachedAt = 0;
  inflight = null;
}

// Clear on logout / tenant token death so the next listPcs hits the
// fresh tenant's PC list. Pre-fix only `auth:unauthorized` was
// subscribed — explicit user-initiated logout left the cache warm,
// so a fresh login as a different user could briefly read the
// previous user's PCs from the 30s TTL window.
authEvents.on('auth:unauthorized', invalidatePcsCache);
authEvents.on('auth:logout', invalidatePcsCache);

interface ListPcsResponse {
  pcs: Pc[];
  zones?: { id: number; name: string }[];
}

export interface PcGridCell {
  row: number;
  col: number;
  /** Operator label override, or generated "A01" style. Never empty. */
  label: string;
  pc_id: number | null;
  pc_code: string | null;
  /**
   * 'free' / 'booked' / 'busy' come from PC session+booking state.
   * 'offline' means the cell exists in the layout but has no linked
   * PC yet (placeholder during rollouts).
   */
  status: 'free' | 'booked' | 'busy' | 'offline';
  is_mine: boolean;
}

export interface PcGridRow {
  row: number;
  /** "A", "B", ... (or "AA" for > 26 rows — see BE rowLabel()). */
  label: string;
  cells: PcGridCell[];
}

export interface PcGridZone {
  zone: {
    id: number;
    name: string;
    price_per_hour: number;
  };
  rows: PcGridRow[];
}

export interface PcGridResponse {
  zones: PcGridZone[];
}

interface BookBody {
  start_at?: string;
  hold_minutes?: number;
  /**
   * Optional — the package id the user selected on time-select. The
   * BE links it to the resulting PcBooking so the BillingEngine
   * knows the session is paid via package (no live wallet
   * deduction) instead of running hourly billing on top of an
   * already-paid package.
   */
  package_id?: number | null;
}

/**
 * Shape returned by `POST /mobile/pcs/{id}/book`. Pre-fix the FE
 * typed this as `{ok: boolean}` and discarded the BE-provided
 * `id`/`reserved_from`/`reserved_until` payload — so payment.tsx
 * couldn't surface the real PcBooking id and had to fabricate
 * `NXR-{pcId}-{HHMM}` strings for the booking-success QR code. The
 * BE response now includes `id`; the FE consumes it to display the
 * canonical booking reference. Audit finding #4.
 */
export interface BookPcResponse {
  ok: boolean;
  /** Real PcBooking.id from the BE — use as the canonical booking ref. */
  id?: number;
  reserved_from?: string;
  reserved_until?: string;
  package_id?: number | null;
}

interface PartyBookBody {
  pc_ids: number[];
  start_at?: string;
  hold_minutes?: number;
}

/**
 * BE shape for `/mobile/pcs/smart-seat`:
 *   { ok, meta: {...}, items: [{pc_id, pc_name, zone_key, zone_name,
 *     status, eta_minutes, hold_available, is_mine, is_preferred_zone}] }
 *
 * Pre-fix (deep audit) the FE typed this endpoint as
 * `{pc, reasoning, alternatives}` which never existed on the wire, so
 * `data.pc.id` blew up with "cannot read property 'id' of undefined"
 * the moment the user opened smart-seat.
 */
interface SmartSeatRawItem {
  pc_id: number;
  pc_name: string;
  zone_key?: string | null;
  zone_name?: string | null;
  status: 'free' | 'booked' | string;
  eta_minutes?: number;
  hold_available?: boolean;
  is_mine?: boolean;
  is_preferred_zone?: boolean;
}

interface SmartSeatRawResponse {
  ok: boolean;
  meta?: {
    arrive_in?: number;
    limit?: number;
    zone_key?: string | null;
    server_now?: string;
    arrive_until?: string;
  };
  items: SmartSeatRawItem[];
}

interface SmartSeatResponse {
  /** Top-ranked candidate. Null when BE returned an empty `items` list. */
  pc: Pc | null;
  /** Remaining picks (BE ranks them itself; we just slice). */
  alternatives: Pc[];
  /** Server-side timing metadata — surfaced for "available in 3 min" hints. */
  meta: SmartSeatRawResponse['meta'];
}

export interface SmartQueueItem {
  id: number;
  zone_key?: string | null;
  zone_name?: string;
  position: number;
  /** Snake-case for back-compat with existing FE callers (some already use this name). */
  estimated_wait_minutes?: number;
  status: 'waiting' | 'notified' | 'ready' | 'cancelled' | string;
  notify_on_free?: boolean;
  ready_now?: boolean;
  eta_min?: number;
}

interface OpenByQrBody {
  /**
   * The PC's tenant-scoped `code` label (e.g. "PC-01", "A28", "VIP12").
   * Maps directly to the `pcs.code` column on the BE; the lookup uses
   * the `(tenant_id, code)` UNIQUE index so it's exact and fast.
   *
   * Pre-fix this contract also carried a numeric `pc_id`, but the BE
   * had no way for the FE to know the primary key from the sticker —
   * stickers print the label, not the id. The redesigned contract is
   * code-only; the BE resolves the integer id internally for caller-
   * identity checks (active session / booking ownership).
   */
  code: string;
}

/**
 * Find the PC that belongs to the current user from a `/mobile/pcs`
 * response. Used by /active-session and /services so both screens
 * agree on "which PC is yours" without duplicating the ownership
 * logic.
 *
 * Why this exists: the BE catalog returns `'busy'` for a PC with any
 * active Session in the tenant, not just the caller's. Filtering by
 * `status === 'busy'` alone surfaces a stranger's PC the moment a
 * second user starts a session. The only reliable ownership signal
 * the catalog exposes is `booking.is_mine` (or `booking.client_id`)
 * — PcBooking rows persist alongside the Session for the duration
 * of the reservation window, so they're available for both
 * `'booked'` (pre-session) and `'busy'` (during-session) states.
 *
 * Returns `null` when no candidate matches — callers should render
 * the "awaiting confirmation" empty state instead of silently
 * pretending some other PC is the user's.
 */
export function findMyPc(list: Pc[], myClientId?: number | null): Pc | null {
  // Primary: trust the BE-computed is_mine flag.
  const mineByFlag = list.find((p) => p.booking?.is_mine === true);
  if (mineByFlag) return mineByFlag;
  // Secondary: explicit client_id match — defensive against an older
  // BE build that returns the booking object without `is_mine`.
  if (myClientId != null) {
    const mineById = list.find((p) => p.booking?.client_id === myClientId);
    if (mineById) return mineById;
  }
  // No match → null. Pre-fix the fallback was "any busy PC in the
  // tenant", which surfaced strangers' PCs in production.
  return null;
}

/**
 * List PCs in the current tenant. Cached for 30s — see the cache
 * docblock at the top of the file. Pass `force: true` to bypass the
 * cache (used by pull-to-refresh handlers).
 */
export async function listPcs(opts?: { force?: boolean }): Promise<Pc[]> {
  const force = opts?.force === true;
  if (!force && cachedPcs && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedPcs;
  }
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await apiGet<ApiResource<ListPcsResponse>>('/mobile/pcs');
      cachedPcs = res.data.pcs ?? [];
      cachedAt = Date.now();
      return cachedPcs;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * GET /mobile/pcs/grid — operator-defined seat layout.
 *
 * Replaces the FE's hardcoded 3-row × 10-col grid (`ROWS=['A','B','C']`,
 * 10 cols) with the real `pc_cells` layout. Each cell is annotated
 * with the live status of its linked PC, so the FE doesn't need a
 * second call to colour seats. Cells without a linked PC come back
 * as `status='offline'` (placeholders during operator rollouts).
 *
 * Not cached on this layer — the seat-select screen mounts once per
 * booking flow and the user is actively scanning the grid; staleness
 * here would mean tapping a "free" seat that was booked seconds ago.
 * The BE downstream booking call rejects double-books, so the worst
 * case is a 422 instead of a successful steal.
 */
export async function getPcGrid(): Promise<PcGridResponse> {
  const res = await apiGet<ApiResource<PcGridResponse>>('/mobile/pcs/grid');
  return res.data;
}

/** Bitta PC bron qilish */
export async function bookPc(pcId: number, body?: BookBody): Promise<BookPcResponse> {
  const res = await apiPost<ApiResource<BookPcResponse>>(`/mobile/pcs/${pcId}/book`, body || {});
  // A successful book flips the seat from free → reserved on the BE.
  // Drop the cache so the next zone-select / seat-select read shows
  // the new state.
  invalidatePcsCache();
  return res.data;
}

/** Bir nechta PC ni bir vaqtda bron qilish */
export async function partyBook(body: PartyBookBody): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>('/mobile/pcs/party-book', body);
  invalidatePcsCache();
  return res.data;
}

/**
 * Tezkor qayta bron.
 *
 * Mirrors `bookPc` cache semantics — quickRebook creates a fresh
 * PcBooking row server-side (MobilePcService::quickRebook), so the
 * 30s in-memory `listPcs` cache must be dropped or the next read
 * will still show the just-rebooked PC as `'free'`. Audit gap fix
 * (booking flow audit item #15).
 */
export async function quickRebook(): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>('/mobile/pcs/rebook-quick');
  invalidatePcsCache();
  return res.data;
}

/** AI-tavsiya qilingan eng yaxshi joy */
export async function smartSeat(opts?: {
  zoneKey?: string | null;
  arriveIn?: number;
  limit?: number;
}): Promise<SmartSeatResponse> {
  const params = new URLSearchParams();
  if (opts?.zoneKey) params.set('zone_key', opts.zoneKey);
  if (opts?.arriveIn != null) params.set('arrive_in', String(opts.arriveIn));
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const url = qs ? `/mobile/pcs/smart-seat?${qs}` : '/mobile/pcs/smart-seat';

  const res = await apiGet<ApiResource<SmartSeatRawResponse>>(url);
  const raw = res.data ?? ({} as SmartSeatRawResponse);
  const items = Array.isArray(raw.items) ? raw.items : [];

  // Adapt each raw seat into the FE's `Pc` shape so the smart-seat
  // screen can reuse the same card components as the catalog screen.
  const toPc = (item: SmartSeatRawItem): Pc => ({
    id: Number(item.pc_id),
    code: String(item.pc_name ?? ''),
    zone_name: item.zone_name ?? undefined,
    status: (item.status as Pc['status']) ?? 'free',
  });

  const all = items.map(toPc);
  return {
    pc: all[0] ?? null,
    alternatives: all.slice(1),
    meta: raw.meta,
  };
}

/**
 * Smart joyni vaqtincha hold qilish.
 *
 * Server-side this creates a PcBooking row reserving the smart-seat
 * pick (MobilePcService::smartSeatHold) — same cache implication as
 * `bookPc` / `quickRebook`. Without `invalidatePcsCache()` the next
 * `listPcs()` would return the just-held PC as `'free'` for up to
 * 30 s because the result lives in the module-level cache. Audit
 * gap fix (booking flow audit item #14).
 */
export async function smartSeatHold(pcId: number): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>('/mobile/pcs/smart-seat/hold', {
    pc_id: pcId,
  });
  invalidatePcsCache();
  return res.data;
}

/** PC ni unbook qilish */
export async function unbookPc(pcId: number): Promise<{ ok: boolean }> {
  const res = await apiDelete<ApiResource<{ ok: boolean }>>(`/mobile/pcs/${pcId}/book`);
  invalidatePcsCache();
  return res.data;
}

/**
 * QR orqali PC ochish.
 *
 * The BE expects `{pc_id, code}` (validated by MobileOpenQrRequest).
 * Pre-fix the FE sent `{qr_code: <raw scanned string>}` which failed
 * validation on every call. The new signature mirrors the BE
 * validator. Callers parse the QR sticker payload into the two
 * components — see qr-scan.tsx for the format `<pcId>:<code>`.
 */
export async function openByQr(body: OpenByQrBody): Promise<{ ok: boolean; pc?: Pc }> {
  const res = await apiPost<ApiResource<{ ok: boolean; pc?: Pc }>>('/mobile/pcs/open', body);
  return res.data;
}

// ---- Smart Queue ----

/** Mening navbatlarim */
export async function listSmartQueue(): Promise<SmartQueueItem[]> {
  const res = await apiGet<ApiResource<{ items: SmartQueueItem[] }>>('/mobile/client/smart-queue');
  return res.data.items ?? [];
}

/**
 * Navbatga turish.
 *
 * Pre-fix (deep audit) the FE sent `{zone_id: number}` but the BE's
 * `MobileSmartQueueJoinRequest` validator expects
 * `{zone_key: string|null, notify_on_free: boolean|null}`. The two
 * are not interchangeable — zones in the queue table are keyed by a
 * stringified zone identifier (e.g. `"id:42"` or `"name:VIP"`), not
 * a numeric id. Pre-fix every join attempt 422'd with no FE
 * feedback because the catch fell through to a silent toast.
 */
export async function joinSmartQueue(opts?: {
  zoneKey?: string | null;
  notifyOnFree?: boolean;
}): Promise<SmartQueueItem> {
  const res = await apiPost<ApiResource<SmartQueueItem>>('/mobile/client/smart-queue/join', {
    zone_key: opts?.zoneKey ?? null,
    notify_on_free: opts?.notifyOnFree ?? true,
  });
  return res.data;
}

/** Navbatdan chiqish */
export async function cancelSmartQueue(itemId: number): Promise<{ ok: boolean }> {
  const res = await apiDelete<ApiResource<{ ok: boolean }>>(`/mobile/client/smart-queue/${itemId}`);
  return res.data;
}
