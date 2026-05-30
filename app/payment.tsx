import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import StepHeader from '../components/time/StepHeader';
import MonitorIcon from '../components/icons/MonitorIcon';
import GiftIcon from '../components/icons/GiftIcon';
import WalletIcon from '../components/icons/WalletIcon';
import LockIcon from '../components/icons/LockIcon';
import ShieldIcon from '../components/icons/ShieldIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import * as pcsApi from '../lib/api/services/pcs';
import { generateIdempotencyKey, getErrorMessage } from '../lib/api/client';
import { useSelectedSeat } from '../lib/state/useSelectedSeat';
import { useSelectedZone } from '../lib/state/useSelectedZone';
import { useAuth } from '../store/AuthProvider';
import KeyboardSafeView from '../components/common/KeyboardSafeView';

type PaymentMethod = 'club_balance' | 'payme' | 'click';

// Per-hour fallback price by zone — used only when /payment arrives
// without `priceAmount` in its params (e.g. a deep-link or a back-then-
// forward navigation that lost state). The normal `/time-select →
// /payment` flow always forwards `priceAmount` and `durationHours`.
const ZONE_PRICE: Record<string, number> = {
  pc: 20000,
  vip: 35000,
  ps5: 25000,
};
const FALLBACK_DURATION_HOURS = 1;

/**
 * Combine a wall-clock time picked on `/time-select` ("14:00") with
 * a YYYY-MM-DD date (provided by the BE slots endpoint) and return
 * an ISO string the BE accepts as `start_at`.
 *
 * Pre-fix this only took `startTime` and assumed "today" — if the
 * user lingered past midnight, or the BE's slots endpoint had
 * rolled forward to tomorrow but the FE didn't know, the local
 * "today rollover" disagreed with the BE's actual slot date and
 * the booking landed on the wrong calendar day. Audit finding #6.
 *
 * Passing `startDate` from `/time-select` keeps both sides aligned:
 * the same date the user saw on the slot chip is the date that
 * goes into start_at.
 */
/**
 * Returned by `buildStartAt` instead of a single ISO string so the
 * caller can distinguish "we couldn't parse the inputs" (rare, the
 * UI should bail) from a successful build. Pre-fix the function
 * silently returned `new Date().toISOString()` on malformed inputs,
 * which booked the user at "right now" instead of erroring loudly —
 * a confusing 4xx-or-nothing outcome the user couldn't act on.
 * Audit booking LOW #18.
 */
type BuiltStartAt =
  | { ok: true; iso: string }
  | { ok: false; reason: 'bad_time' | 'bad_date_with_time' };

/**
 * Slot times displayed in /time-select are TENANT-local (the BE's
 * /booking/slots endpoint returns HH:MM strings in the club's
 * operational TZ — currently Asia/Tashkent for every tenant). We
 * must rebuild the same instant on the way OUT regardless of the
 * device's TZ — `new Date("YYYY-MM-DDTHH:MM:00")` without an
 * offset hands JS the phone's local TZ as the assumed zone, which
 * means a developer on UTC-N or a customer travelling abroad
 * sends an ISO that maps to a different wall-clock hour back in
 * the club. Operator hit this on a UTC+11 simulator: picked 11:00,
 * the BE stored 00:00 UTC, the active-session screen rendered
 * "05:00" in Tashkent.
 *
 * Fix: hard-code "+05:00" as the slot offset until we add a
 * per-tenant TZ field. The cleanest signal is the offset itself —
 * we don't need a tz database lookup, just to tag the wall-clock
 * time with Tashkent's offset so JS's Date parser interprets it
 * correctly.
 */
const TENANT_TZ_OFFSET = '+05:00';

function buildStartAt(startTime: string, startDate?: string): BuiltStartAt {
  const [hh, mm] = startTime.split(':').map((p) => Number(p));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
    return { ok: false, reason: 'bad_time' };
  }

  if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    const pad = (n: number) => String(n).padStart(2, '0');
    // Tag the time with the tenant's offset so the resulting Date
    // points at the right UTC instant on every device.
    const target = new Date(
      `${startDate}T${pad(hh)}:${pad(mm)}:00${TENANT_TZ_OFFSET}`,
    );
    if (!Number.isNaN(target.getTime())) {
      return { ok: true, iso: target.toISOString() };
    }
    return { ok: false, reason: 'bad_date_with_time' };
  }

  // Legacy fallback path — used only when startDate is missing
  // (older builds, deep-link entry without time-select context).
  // Same TZ pin as above: build today's local-Tashkent ISO, then
  // bump by a day if it's already past.
  const todayInTashkent = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Tashkent',
  }); // YYYY-MM-DD
  const pad = (n: number) => String(n).padStart(2, '0');
  let target = new Date(
    `${todayInTashkent}T${pad(hh)}:${pad(mm)}:00${TENANT_TZ_OFFSET}`,
  );
  if (target.getTime() < Date.now()) {
    target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
  }
  return { ok: true, iso: target.toISOString() };
}

interface PaymentMethodConfig {
  id: PaymentMethod;
  title: string;
  subtitle?: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  bgColor: string;
}

function formatSum(value: number): string {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ');
}

function PaymeIcon({ size = 18 }: { size?: number }) {
  return (
    <Text style={{ fontFamily: Fonts.inter.bold, fontSize: size, color: '#FFFFFF' }}>P</Text>
  );
}

function ClickIcon({ size = 18 }: { size?: number }) {
  return (
    <Text style={{ fontFamily: Fonts.inter.bold, fontSize: size, color: '#FFFFFF' }}>C</Text>
  );
}

export default function PaymentScreen() {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  // The user always pays from their currently-active tenant (the one
  // they last switched into, surfaced through AuthProvider). Picking
  // `clubs[0]` of a hardcoded fixture would credit a different club's
  // wallet than the one being booked.
  const { clubs, currentTenantId } = useAuth();
  // Strict match — pre-fix this fell back to `clubs[0]` when
  // `currentTenantId` was null (post-logout / token expiry mid-flow),
  // so the user could silently book a seat on the WRONG tenant's PC
  // catalogue. Now we keep the membership null when no tenant is
  // active and the effect below bounces them to /clubs-switch. The
  // null-check below the destructure (`if (!currentTenantId)`)
  // doesn't get a chance to redirect synchronously, so the JSX
  // additionally tolerates `activeMembership = null` and the
  // Confirm button is disabled in that state.
  const activeMembership =
    clubs.find((c) => c.tenant_id === currentTenantId) ?? null;
  const hasClubBalance = !!activeMembership && (activeMembership.balance ?? 0) > 0;

  // Tenant gate — if the user reached /payment with no active tenant
  // (deep link, stale stack, race between switchClub failure and
  // navigation), redirect to clubs-switch instead of booking against
  // a phantom tenant. Audit finding #7.
  useEffect(() => {
    if (currentTenantId == null) {
      router.replace('/clubs-switch');
    }
  }, [currentTenantId]);
  const { zoneId } = useSelectedZone();
  const { seatId, pcId } = useSelectedSeat(zoneId ?? 'pc');

  // Params forwarded from `/time-select`. All come back as strings (or
  // undefined when the screen was opened via a back-stack pop without
  // a fresh push) — we parse defensively so a missing param doesn't
  // crash the screen but instead falls back onto the zone-price route.
  const params = useLocalSearchParams<{
    packageId?: string;
    packageTitle?: string;
    priceAmount?: string;
    durationHours?: string;
    startTime?: string;
    /**
     * YYYY-MM-DD from `/time-select`'s `BookingSlotsResponse.date`.
     * When present, buildStartAt uses it directly; when missing
     * (older deep-link, no slot endpoint), buildStartAt falls back
     * to the legacy "today + auto-rollover" path. Audit finding #6.
     */
    startDate?: string;
  }>();
  const packagePrice = params.priceAmount ? Number(params.priceAmount) : null;
  const packageDuration = params.durationHours ? Number(params.durationHours) : null;

  // Promo code support is intentionally disabled until the backend
  // `/mobile/promotions/validate` endpoint ships. The previous UI
  // accepted any non-empty string and showed a 10% client-side
  // discount that the BE never honoured — so the user saw "you saved
  // 2 000 so'm" but was charged the full amount. Better to hide the
  // input entirely than lie about savings.
  const PROMO_INPUT_ENABLED = false;
  const [promo, setPromo] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Synchronous double-submit guard. `setConfirming(true)` is an async
  // React state mutation — on slow networks a rapid double-tap fires
  // `onConfirm` twice before React renders the disabled button. The
  // BE serialises the actual booking via `lockForUpdate`, but the
  // loser hits 422 and shows a confusing error *after* the user
  // already saw "success" navigation. The ref flag short-circuits the
  // second tap synchronously, before the network round-trip starts.
  // Audit finding #2.
  const submittingRef = useRef(false);

  // Stable Idempotency-Key for THIS booking intent. Keyed on the
  // selection (seat + slot + date + package) so it stays constant
  // across retries and accidental double-taps of Confirm — the BE
  // de-dups a retried POST and returns the original PcBooking instead
  // of double-debiting the deposit. If the user goes back and picks a
  // different seat / time / package, the inputs change, the memo
  // recomputes, and the new booking gets its own key. Pre-fix the
  // axios interceptor minted a fresh UUID on every POST, so a network
  // retry of the same charge looked like a brand-new request to the BE
  // — the double-charge the key was supposed to prevent.
  const bookingIdempotencyKey = useMemo(
    () => generateIdempotencyKey(),
    [seatId, pcId, params.startTime, params.startDate, params.packageId],
  );

  // Prefer the package price + duration forwarded from /time-select
  // (the source of truth for what the user chose). For balance-mode
  // (no package), use the operator-set per-hour price stored in
  // `useSelectedZone` when zone-select recorded the pick. Falls
  // back to the FE-constant ZONE_PRICE table only when the
  // singleton is empty (deep-link entry without going through
  // zone-select). Pre-fix this read the hardcoded table directly,
  // so a 12 000-sum/h zone showed 20 000 sum on the payment screen.
  const zonePricePerHour = useSelectedZone().zonePricePerHour;
  const pricePerHour =
    zonePricePerHour ?? ZONE_PRICE[zoneId ?? 'pc'] ?? ZONE_PRICE.pc;
  const durationHours =
    packageDuration && Number.isFinite(packageDuration) ? packageDuration : FALLBACK_DURATION_HOURS;
  const subtotal =
    packagePrice && Number.isFinite(packagePrice) ? packagePrice : pricePerHour * durationHours;
  const promoDiscount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const total = Math.max(0, subtotal - promoDiscount);

  // Detect insufficient balance BEFORE the user confirms — pre-fix
  // they'd tap Confirm, see the BE return 4xx with a generic
  // "insufficient funds" toast, and have no idea how much more to
  // top up. Now we compute the shortfall on the FE and disable the
  // Confirm button with an inline warning explaining the gap.
  // Only applies when the user picked club_balance as the method;
  // PSP methods are gated soon so the check doesn't bite there.
  const clubBalance = activeMembership?.balance ?? 0;
  const isClubBalanceMethod = method === 'club_balance';
  const balanceShortfall =
    isClubBalanceMethod && total > clubBalance ? total - clubBalance : 0;
  const hasInsufficientBalance = balanceShortfall > 0;

  // Same start-time computation as `buildStartAt` below, but exposed
  // here so we can show a warning when the user's picked slot rolls
  // forward to tomorrow. The rollover only happens when the BE didn't
  // provide an explicit `startDate` (legacy path); when we have a
  // valid BE date the rollover indicator is suppressed (because we
  // know the BE already accounted for tomorrow-vs-today).
  const rolledToTomorrow = useMemo(() => {
    if (!params.startTime) return false;
    if (params.startDate && /^\d{4}-\d{2}-\d{2}$/.test(params.startDate)) {
      // BE-supplied date — no client-side guessing.
      return false;
    }
    const [hh, mm] = String(params.startTime).split(':').map((p) => Number(p));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;
    const target = new Date();
    target.setHours(hh, mm, 0, 0);
    return target.getTime() < Date.now();
  }, [params.startTime, params.startDate]);

  const onConfirm = async () => {
    if (!method) return;
    // Synchronous guard against double-tap — fires BEFORE the React
    // state update so a 50ms-spaced double-tap can't both reach the
    // BE. Pre-fix the `confirming` state guarded the button visually
    // but didn't catch taps fired between the touch event and the
    // state render.
    if (submittingRef.current) return;
    if (!seatId) {
      toast.error(t.payment.errorSeatMissing);
      return;
    }
    if (hasInsufficientBalance) {
      // Belt-and-braces: the Confirm button is disabled in this
      // state, but if a future code path lets the tap fire (e.g. a
      // race between balance refresh and button disable), surface
      // a clear toast instead of letting the BE return a generic
      // 4xx the user has to decipher.
      toast.error(t.payment.errorInsufficientBalance);
      return;
    }
    if (!currentTenantId) {
      // Tenant gate fallback — should be caught by the useEffect
      // above, but defence-in-depth in case the redirect hasn't
      // completed when the user taps.
      toast.error(t.payment.errorSeatUnavailable);
      router.replace('/clubs-switch');
      return;
    }

    submittingRef.current = true;
    setConfirming(true);
    try {
      // pcId comes straight from the grid endpoint via useSelectedSeat
      // — no post-hoc `listPcs().find(p => p.code === seatId)` lookup
      // required. Pre-fix that lookup was fragile because the FE's
      // cell label (`"A01"` or operator-defined `"VIP-1"`) only loosely
      // matched the BE's PC `code` field (often `"PC-1"` / `"STD-3"`
      // depending on what the CP-side admin typed). Now we carry the
      // canonical `pc_id` through the booking flow from the moment
      // of selection.
      if (!pcId) {
        // Defensive: the only path to a null pcId here is a stale
        // seat singleton from a previous flow (race between
        // clearBookingSelections + screen re-mount). Force the user
        // back to seat-select rather than silently booking
        // "whatever's free".
        toast.error(t.payment.errorSeatUnavailable);
        return;
      }

      // Re-check live status before locking — the PC may have been
      // booked by someone else during the seat-selection → payment
      // window. Pre-fix this read from the cached `listPcs` (30s
      // TTL), so a PC booked 25s ago by another user still showed
      // `'free'` here and the BE would 422 the actual book call.
      // Forcing a fresh fetch closes that race window. Audit
      // finding #13.
      const pcs = await pcsApi.listPcs({ force: true });
      const target = pcs.find((p) => p.id === pcId);
      if (!target) {
        // PC disappeared between selection and confirm (extremely
        // rare — operator removed it mid-flow).
        toast.error(t.payment.errorSeatUnavailable);
        return;
      }
      if (target.status !== 'free') {
        toast.error(t.payment.errorSeatTaken);
        return;
      }

      // Send the actual selection to the BE. `start_at` is computed
      // from the user's picked time slot; `hold_minutes` reflects the
      // package duration so the seat-reservation window matches what
      // the user paid for. Without this body the BE silently picked
      // its own start time and 1-hour hold — users were paying for
      // 3-hour packages and getting 1-hour reservations.
      //
      // package_id is forwarded so the BE links the reservation to
      // the purchased package. The BillingEngine reads this on
      // session start and switches from hourly billing (deducts
      // wallet every minute) to package mode (free for the package
      // window). Without it the user would be double-charged: once
      // here, once via session billing.
      // Resolve start_at — bail loudly on malformed inputs rather
      // than silently booking "right now" as the pre-fix did. Audit
      // booking LOW #18.
      let startAtIso: string | undefined;
      if (params.startTime) {
        const built = buildStartAt(params.startTime, params.startDate);
        if (!built.ok) {
          toast.error(t.payment.errorSeatMissing);
          return;
        }
        startAtIso = built.iso;
      }
      const holdMinutes = Math.max(1, Math.round(durationHours * 60));
      const packageIdNum = params.packageId ? Number(params.packageId) : null;
      const isPackageMode = Number.isFinite(packageIdNum) && (packageIdNum as number) > 0;
      // Reservation deposit — only set for balance/hourly mode.
      // Package mode passes 0 (the package itself is the
      // commitment). See the BE migration docblock at
      // 2026_05_17_010000_add_reservation_deposit_columns for the
      // full accounting model. The BE re-checks balance under a row
      // lock before debiting; sending this number doesn't bypass
      // the wallet guard.
      const depositAmount = isPackageMode ? 0 : total;
      // Pass the stable per-intent key so a retry / double-tap of this
      // same booking reuses it and the BE de-dups instead of creating
      // a second reservation + double-charging the deposit.
      const bookRes = await pcsApi.bookPc(
        pcId,
        {
          start_at: startAtIso,
          hold_minutes: holdMinutes,
          package_id: isPackageMode ? (packageIdNum as number) : null,
          deposit_amount: depositAmount,
        },
        bookingIdempotencyKey,
      );

      // Real PcBooking id from the BE — replaces the previously
      // fabricated `NXR-{pcId}-{HHMM}` string. Staff scanning the QR
      // on booking-success now matches against the canonical
      // PcBooking.id, so the booking can be reconciled in the
      // operator dashboard. Audit finding #4. The `NXR-` prefix is
      // preserved as a user-facing namespace so the visible id reads
      // as a Nexora reference, not a bare integer.
      const realId = bookRes.id;
      const bookingRef =
        realId != null
          ? `NXR-${String(realId).padStart(6, '0')}`
          : // Defensive fallback for an older BE build that doesn't
            // emit `id` — keep the previous pseudo-id format so the
            // screen still has something to render.
            `NXR-${target.id}-${(startAtIso ?? '').slice(11, 16).replace(':', '')}`;

      router.replace({
        pathname: '/booking-success',
        params: {
          clubName: activeMembership?.tenant_name ?? '',
          seatCode: seatId || target.code,
          zoneLabel: zoneId ?? 'pc',
          packageTitle: params.packageTitle ?? '',
          startTime: params.startTime ?? '',
          durationHours: String(durationHours),
          totalAmount: String(total),
          bookingId: bookingRef,
        },
      });
    } catch (e) {
      // Specialised handling for the concurrent-loser case — when two
      // users race to book the same PC, the BE's `lockForUpdate`
      // serialises them and the loser receives:
      //   422 "PC is already booked by another client or busy now"
      // Pre-fix this surfaced as a generic toast and left the user
      // stuck on /payment with a dead selection — re-tapping Confirm
      // just 422'd again. Now we detect the message, push back to
      // /seat-select with a clear toast so the user picks a
      // different seat. Audit finding #3.
      const msg = String(getErrorMessage(e) ?? '');
      if (/already booked|busy now/i.test(msg)) {
        toast.error(t.payment.errorSeatTaken);
        // Force a fresh listPcs read next time so the seat-select
        // grid doesn't show the just-lost PC as still-free.
        pcsApi.invalidatePcsCache();
        router.back();
      } else {
        toast.error(msg);
      }
    } finally {
      submittingRef.current = false;
      setConfirming(false);
    }
  };

  const PAYMENT_METHODS: PaymentMethodConfig[] = useMemo(
    () => [
      ...(hasClubBalance && activeMembership
        ? [
            {
              id: 'club_balance' as PaymentMethod,
              title: t.payment.methodClubBalance,
              subtitle: t.payment.methodClubBalanceSub
                .replace('{name}', activeMembership.tenant_name)
                .replace(
                  '{balance}',
                  `${formatSum(activeMembership.balance)} ${t.common.currencyUnit}`,
                ),
              Icon: WalletIcon,
              bgColor: '#7C3AED',
            },
          ]
        : []),
      // Payme + Click options hidden pre-launch — same gate as
      // `/wallet-topup`: the PSP webhook → balance credit pipeline
      // isn't wired end-to-end yet. Users pay for bookings out of
      // their club balance (topped up at the club's till). Restore
      // both methods here when PSP integration ships.
    ],
    [t, hasClubBalance, activeMembership],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardSafeView>
      <StepHeader step={t.payment.headerStep} title={t.payment.headerTitle} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t.payment.title}</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(0, 207, 255, 0.12)' }]}>
              <MonitorIcon size={18} color="#00CFFF" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>{t.payment.summaryZone}</Text>
              <Text style={styles.summarySubtitle}>
                {t.payment.summarySeat.replace('{seat}', seatId ?? '—')}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(124, 58, 237, 0.15)' }]}>
              <GiftIcon size={18} color="#7C3AED" />
            </View>
            <View style={styles.summaryContent}>
              {/* Title:
                  - Package selected → operator-set package name
                    (e.g. "Premium pass", "Tungi paket")
                  - Balance / hourly mode → localised "Hourly billing"
                  Pre-fix everyone saw the same "Почасовой" string
                  regardless of which option they actually picked. */}
              <Text style={styles.summaryTitle}>
                {params.packageTitle && params.packageTitle.length > 0
                  ? params.packageTitle
                  : t.payment.summaryHourly}
              </Text>
              {/* Subtitle layout:
                    {DD MMM, HH:MM – HH:MM}   ·  {N h}
                    {pricePerHour}/{h}                       (balance mode only)
                  The first line is always shown so the user sees
                  WHICH session they're booking; the second line
                  only renders for balance mode and shows the unit
                  rate that produced the subtotal above. Package
                  mode hides the unit-rate line because the price
                  is flat-rate by design. */}
              <Text style={styles.summarySubtitle}>
                {`${t.payment.summaryTime} · ${durationHours} ${t.timeSelect.hoursSuffix}`}
              </Text>
              {(!params.priceAmount || params.priceAmount === '') && (
                <Text style={styles.summarySubtitle}>
                  {`${formatSum(pricePerHour)} ${t.common.currencyUnit}/${t.timeSelect.hoursSuffix}`}
                </Text>
              )}
            </View>
            <Text style={styles.summaryPrice}>{formatSum(subtotal)} {t.common.currencyUnit}</Text>
          </View>
        </View>

        {/* Deposit/refund explainer — visible only in balance/hourly
            mode. Booking debits the user's balance for one hour as
            a reservation hold; when they actually sit at the PC and
            the shell starts the session, the hold is refunded so
            real-time billing takes over. No-shows lose the hold as
            a commitment fee. Package mode skips this banner because
            packages are flat-rate by design. */}
        {(!params.priceAmount || params.priceAmount === '') && (
          <View style={styles.depositCard}>
            <View style={styles.depositRow}>
              <View style={styles.depositIcon}>
                <Text style={styles.depositIconGlyph}>ⓘ</Text>
              </View>
              <View style={styles.depositText}>
                <Text style={styles.depositTitle}>{t.payment.depositTitle}</Text>
                <Text style={styles.depositSub}>
                  {t.payment.depositSub.replace(
                    '{amount}',
                    `${formatSum(subtotal)} ${t.common.currencyUnit}`,
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>{t.payment.promoLabel}</Text>
        {PROMO_INPUT_ENABLED && (
          <View style={styles.promoRow}>
            <TextInput
              style={styles.promoInput}
              placeholder={t.payment.promoPlaceholder}
              placeholderTextColor="#6B7280"
              value={promo}
              onChangeText={setPromo}
            />
            {/* Promo-apply CTA — md outline so it reads as a paired
                secondary action sitting next to the promo text input.
                Currently dead behind PROMO_INPUT_ENABLED until the
                BE validate endpoint ships. */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setPromoApplied(true)}
              disabled={promo.trim().length === 0 || promoApplied}
              accessibilityRole="button"
              accessibilityLabel={t.payment.promoApply}
              accessibilityState={{
                disabled: promo.trim().length === 0 || promoApplied,
              }}
              style={[
                promoBtnStyles.btn,
                (promo.trim().length === 0 || promoApplied) &&
                  promoBtnStyles.btnDisabled,
              ]}
            >
              <Text
                style={promoBtnStyles.label}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {t.payment.promoApply}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.priceBlock}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t.payment.subtotal}</Text>
            <Text style={styles.priceValue}>{formatSum(subtotal)} {t.common.currencyUnit}</Text>
          </View>
          {promoApplied && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t.payment.promoLabel}</Text>
              <Text style={styles.priceValue}>−{formatSum(promoDiscount)} {t.common.currencyUnit}</Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t.payment.serviceFee}</Text>
            <Text style={styles.priceValue}>0 {t.common.currencyUnit}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>{t.payment.total}</Text>
            <Text style={styles.totalValue}>{formatSum(total)} {t.common.currencyUnit}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t.payment.methodLabel}</Text>
        {PAYMENT_METHODS.length === 0 ? (
          // Empty methods list — the user has no club balance AND
          // the in-app Payme/Click options are gated pre-launch.
          // Surface a clear "top up at the club" message instead of
          // a silent empty section + a disabled Confirm button.
          <View style={styles.methodEmpty}>
            <Text style={styles.methodEmptyTitle}>
              {t.payment.noMethodsTitle}
            </Text>
            <Text style={styles.methodEmptySub}>
              {t.payment.noMethodsSub}
            </Text>
          </View>
        ) : (
          PAYMENT_METHODS.map((m) => {
            const isActive = method === m.id;
            return (
              <Pressable
                key={m.id}
                style={[styles.methodRow, isActive && styles.methodRowActive]}
                onPress={() => setMethod(m.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${m.title}${m.subtitle ? `, ${m.subtitle}` : ''}`}
              >
                <View style={[styles.methodIcon, { backgroundColor: m.bgColor }]}>
                  <m.Icon size={18} color={Colors.white} />
                </View>
                <View style={styles.methodContent}>
                  <Text style={styles.methodTitle}>{m.title}</Text>
                  {m.subtitle && (
                    <Text style={styles.methodSubtitle} numberOfLines={1}>
                      {m.subtitle}
                    </Text>
                  )}
                </View>
                <View style={[styles.radio, isActive && styles.radioActive]}>
                  {isActive && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })
        )}

        {/* Pre-flight balance warning — surfaced when the user has
            picked the club-balance method but the total exceeds
            their on-file balance. The Confirm button is also disabled
            below to prevent the obvious 4xx-on-submit dead-end. */}
        {hasInsufficientBalance && (
          <View style={styles.warnCard}>
            <Text style={styles.warnTitle}>
              {t.payment.errorInsufficientBalance}
            </Text>
            <Text style={styles.warnSub}>
              {t.payment.errorInsufficientBalanceDetail
                .replace('{amount}', formatSum(balanceShortfall))
                .replace('{unit}', t.common.currencyUnit)}
            </Text>
          </View>
        )}

        {/* Rollover warning — the picked start time is in the past
            (e.g. user picked "10:00" at 14:00), so the booking will
            roll forward to TOMORROW at the same time. Pre-fix this
            was silent and users were surprised to see "Tomorrow"
            on the success screen. */}
        {rolledToTomorrow && params.startTime && (
          <View style={[styles.warnCard, styles.warnCardInfo]}>
            <Text style={[styles.warnTitle, styles.warnTitleInfo]}>
              {t.payment.rolledToTomorrowWarning.replace(
                '{time}',
                String(params.startTime),
              )}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Confirm-payment CTA — lg pill with leading LockIcon to
            reinforce "this is the secure commit step". Gated on
            both a method being picked AND no insufficient-balance
            warning so the misfire 4xx is impossible. Spinner-only
            loading (the BE call is fast, label flash would feel
            jittery on a payment screen). */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onConfirm}
          disabled={!method || hasInsufficientBalance || confirming}
          accessibilityRole="button"
          accessibilityLabel={t.payment.confirmBtn}
          accessibilityState={{
            disabled: !method || hasInsufficientBalance || confirming,
            busy: confirming,
          }}
          style={[
            confirmBtnStyles.btn,
            (!method || hasInsufficientBalance || confirming) &&
              confirmBtnStyles.btnDisabled,
          ]}
        >
          <LinearGradient
            colors={['#3B5BF5', '#8B3DF5']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={confirmBtnStyles.fill}
          >
            {confirming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <LockIcon size={16} color={Colors.white} />
                <Text
                  style={confirmBtnStyles.label}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {t.payment.confirmBtn}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.secureRow}>
          <ShieldIcon size={12} color="#22C55E" />
          <Text style={styles.secureText}>{t.payment.secure}</Text>
        </View>
      </View>
      </KeyboardSafeView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  summaryCard: {
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  summarySubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
    marginTop: 1,
  },
  summaryPrice: {
    fontFamily: Fonts.inter.bold,
    fontSize: 14,
    color: Colors.text,
  },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  // Deposit explainer card — sits right under the summary, before
  // the promo row. Amber tint marks it as "you should read this"
  // without screaming danger (deposit-refund is normal, not an
  // error). Renders only in balance/hourly mode.
  depositCard: {
    marginTop: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  depositRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  depositIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositIconGlyph: {
    fontFamily: Fonts.inter.bold,
    fontSize: 14,
    color: '#F59E0B',
  },
  depositText: {
    flex: 1,
    gap: 4,
  },
  depositTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: '#F59E0B',
  },
  depositSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#C7CAD1',
  },
  promoRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    height: 46,
    backgroundColor: '#141823',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: Colors.text,
  },
  priceBlock: {
    marginTop: 18,
    gap: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    color: '#8B95A8',
  },
  priceValue: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13.5,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 4,
  },
  totalLabel: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    color: Colors.text,
  },
  totalValue: {
    fontFamily: Fonts.inter.bold,
    fontSize: 16,
    color: Colors.text,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  methodEmpty: {
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    gap: 6,
  },
  methodEmptyTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: '#F59E0B',
  },
  methodEmptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    lineHeight: 18,
  },
  // Inline warning card — red border + amber text for destructive
  // ("insufficient balance"), cyan border for informational
  // ("rolled to tomorrow"). Sits between the methods list and the
  // bottom action bar so the user has to see it before tapping
  // Confirm.
  warnCard: {
    marginTop: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.40)',
    padding: 12,
    gap: 4,
  },
  warnCardInfo: {
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
    borderColor: 'rgba(0, 207, 255, 0.35)',
  },
  warnTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#EF4444',
  },
  warnTitleInfo: {
    color: '#00CFFF',
  },
  warnSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#FFB4B4',
    lineHeight: 17,
  },
  methodRowActive: {
    borderColor: '#00CFFF',
    backgroundColor: 'rgba(0, 207, 255, 0.06)',
  },
  methodIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodContent: {
    flex: 1,
    gap: 2,
  },
  methodTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  methodSubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#3A4250',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#00CFFF',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00CFFF',
  },
  // No shadow / elevation — top border + dark slab separate this
  // sticky bar from the scroll content above without needing a glow.
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secureText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
});

// Inline promo-apply styles — md (44pt) outline pill so it reads as
// a paired secondary action beside the text input. Lives behind the
// PROMO_INPUT_ENABLED gate until the BE endpoint ships.
const promoBtnStyles = StyleSheet.create({
  btn: {
    height: 44,
    borderRadius: 999,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 207, 255, 0.45)',
    minWidth: 100,
  },
  btnDisabled: { opacity: 0.5 },
  label: {
    color: '#00CFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    letterSpacing: 0.1,
  },
});

// Inline confirm-payment CTA — 52pt lg pill anchored to bottom bar.
// LockIcon + label arranged in a 10pt-gap row inside the gradient.
const confirmBtnStyles = StyleSheet.create({
  btn: { height: 52, borderRadius: 999, alignSelf: 'stretch', overflow: 'hidden' },
  btnDisabled: { opacity: 0.5 },
  fill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});
