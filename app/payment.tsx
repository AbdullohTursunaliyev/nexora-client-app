import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import StepHeader from '../components/time/StepHeader';
import MonitorIcon from '../components/icons/MonitorIcon';
import GiftIcon from '../components/icons/GiftIcon';
import WalletIcon from '../components/icons/WalletIcon';
import LockIcon from '../components/icons/LockIcon';
import ShieldIcon from '../components/icons/ShieldIcon';
import Button from '../components/common/Button';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import * as pcsApi from '../lib/api/services/pcs';
import { getErrorMessage } from '../lib/api/client';
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
 * today's date and return an ISO string the BE accepts as `start_at`.
 * If the parsed time is in the past (user picked a slot earlier than
 * "now" — happens for the "10:00" chip after lunch) we roll forward
 * to tomorrow so the booking is never created with a past timestamp.
 */
function buildStartAt(startTime: string): string {
  const [hh, mm] = startTime.split(':').map((p) => Number(p));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return new Date().toISOString();
  const target = new Date();
  target.setHours(hh, mm, 0, 0);
  if (target.getTime() < Date.now()) {
    target.setDate(target.getDate() + 1);
  }
  return target.toISOString();
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
  const activeMembership = clubs.find((c) => c.tenant_id === currentTenantId) ?? clubs[0];
  const hasClubBalance = !!activeMembership && (activeMembership.balance ?? 0) > 0;
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

  // Prefer the package price + duration forwarded from /time-select
  // (the source of truth for what the user chose). Fall back to the
  // per-zone hourly rate × 1 hour only when the params are missing —
  // typically a navigation regression we don't want to crash on.
  const pricePerHour = ZONE_PRICE[zoneId ?? 'pc'] ?? ZONE_PRICE.pc;
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
  // forward to tomorrow. Pre-fix the rollover was silent — user
  // picked "10:00" at 14:00 expecting today, got booked tomorrow
  // 10:00 without realising.
  const rolledToTomorrow = useMemo(() => {
    if (!params.startTime) return false;
    const [hh, mm] = String(params.startTime).split(':').map((p) => Number(p));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;
    const target = new Date();
    target.setHours(hh, mm, 0, 0);
    return target.getTime() < Date.now();
  }, [params.startTime]);

  const onConfirm = async () => {
    if (!method) return;
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
      // window. We still hit /mobile/pcs (cached for 30s) so we
      // don't depend on stale grid data either.
      const pcs = await pcsApi.listPcs();
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
      const startAtIso = params.startTime ? buildStartAt(params.startTime) : undefined;
      const holdMinutes = Math.max(1, Math.round(durationHours * 60));
      const packageIdNum = params.packageId ? Number(params.packageId) : null;
      await pcsApi.bookPc(pcId, {
        start_at: startAtIso,
        hold_minutes: holdMinutes,
        package_id: Number.isFinite(packageIdNum) ? packageIdNum : null,
      });

      // Forward real values to the confirmation screen so it shows the
      // actual seat, time, package, and total — replacing the
      // hardcoded "NXR-27836 / A08 / 12 may, 12:00-13:00" mock. We
      // prefer the user-facing cell label (seatId — what they tapped)
      // over the BE's pc.code field. They picked "VIP-1" on the
      // seat-select grid; showing "PC-1" on the confirmation would
      // make them wonder if they got the right seat.
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
          // Use the BE-side PC id + ISO start as a stable booking
          // identifier until the BE returns a real reservation id.
          bookingId: `NXR-${target.id}-${(startAtIso ?? '').slice(11, 16).replace(':', '')}`,
        },
      });
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
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
              <Text style={styles.summaryTitle}>{t.payment.summaryHourly}</Text>
              <Text style={styles.summarySubtitle}>{t.payment.summaryTime}</Text>
            </View>
            <Text style={styles.summaryPrice}>{formatSum(subtotal)} {t.common.currencyUnit}</Text>
          </View>
        </View>

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
            <Button
              label={t.payment.promoApply}
              variant="outline"
              size="md"
              disabled={promo.trim().length === 0 || promoApplied}
              onPress={() => setPromoApplied(true)}
            />
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
        <Button
          label={t.payment.confirmBtn}
          variant="primary"
          size="lg"
          fullWidth
          loading={confirming}
          disabled={!method || hasInsufficientBalance}
          icon={<LockIcon size={16} color={Colors.white} />}
          onPress={onConfirm}
        />
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
