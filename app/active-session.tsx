import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { Images } from '../constants/Images';
import SimpleHeader from '../components/common/SimpleHeader';
import CheckIcon from '../components/icons/CheckIcon';
import LocationPinIcon from '../components/icons/LocationPinIcon';
import GamepadIcon from '../components/icons/GamepadIcon';
import CalendarIcon from '../components/icons/CalendarIcon';
import GiftIcon from '../components/icons/GiftIcon';
import WalletIcon from '../components/icons/WalletIcon';
import CopyIcon from '../components/icons/CopyIcon';
import StopIcon from '../components/icons/StopIcon';
import StaffIcon from '../components/icons/StaffIcon';
import MessageCircleIcon from '../components/icons/MessageCircleIcon';
import SettingsIcon from '../components/icons/SettingsIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import * as pcsApi from '../lib/api/services/pcs';
import { getErrorMessage } from '../lib/api/client';
import type { Pc } from '../lib/api/types';
import { useDialog } from '../components/common/AppDialog';
import { useAuth } from '../store/AuthProvider';

const pad = (n: number) => String(n).padStart(2, '0');

type IconCmp = React.ComponentType<{ size?: number; color?: string }>;

/**
 * Tashkent offset (UTC+5) — Hermes (RN's default JS engine) does NOT
 * honour the `timeZone` option on `Intl.DateTimeFormat`, so we math
 * the offset ourselves to render booking times in the club's wall-
 * clock zone regardless of the device's TZ. Once we onboard a tenant
 * in a different TZ we'll move this to a per-tenant setting.
 */
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Stringify an ISO datetime as "HH:MM" in Tashkent local time. */
function formatHHMM(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const shifted = new Date(d.getTime() + TASHKENT_OFFSET_MS);
  return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/** Format a reservation window as "HH:MM - HH:MM" in Tashkent. */
function formatTimeRange(
  fromIso: string | null | undefined,
  untilIso: string | null | undefined,
): string {
  const from = formatHHMM(fromIso);
  const to = formatHHMM(untilIso);
  if (from === '—' && to === '—') return '—';
  if (to === '—') return from;
  return `${from} - ${to}`;
}

function formatSum(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('ru-RU').replace(/,/g, ' ');
}

/**
 * /active-session is the "your live booking" hub — reached from
 * /booking-success (post-payment), from the QR-scan flow (when staff
 * has just opened the session at the till), and from the bookings tab
 * (returning users checking their reservation status).
 *
 * It mirrors the post-payment booking-success card layout so the user
 * sees the *same* booking summary that confirmed the purchase
 * (operator-reported friction: pre-fix the screens diverged — booking-
 * success had ID / club / zone / time / package / total / QR /
 * countdown; /active-session had only PC code + start time + elapsed,
 * so users felt their booking "disappeared" after the success screen
 * auto-dismissed). The cancel/end action is the primary CTA at the
 * bottom so the user can release the seat without hunting through
 * tabs.
 */
export default function ActiveSessionScreen() {
  const t = useT();
  const toast = useToast();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { clubs, currentTenantId } = useAuth();
  const activeMembership =
    clubs.find((c) => c.tenant_id === currentTenantId) ?? null;
  const myClientId = activeMembership?.client_id ?? null;

  const [seconds, setSeconds] = useState(0);
  const [activePc, setActivePc] = useState<Pc | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [ending, setEnding] = useState(false);

  // 1Hz timer + 30s PC poll — both pause when the app is backgrounded
  // so we don't drain battery / waste network on a screen the user
  // isn't looking at (FE-H7). They resume on foreground.
  const isForeground = useRef(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      isForeground.current = state === 'active';
    });
    return () => sub.remove();
  }, []);

  // Only tick when the PC is actually 'busy'. For 'booked' status
  // (reservation placed, session not started yet) the elapsed counter
  // is hidden in favour of a countdown to reserved_from.
  const isLive = activePc?.status === 'busy';

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => {
      if (isForeground.current) setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isLive]);

  // Pull the user's currently-busy or booked PC from the BE catalog.
  // Polls every 30s so the card stays fresh (operator status changes
  // remotely; package/deposit fields refresh on each poll too).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isForeground.current) return;
      try {
        const list = await pcsApi.listPcs();
        if (cancelled) return;
        const mine = pcsApi.findMyPc(list, myClientId);
        if (mine) {
          setActivePc(mine);
          const startedAtRaw = mine.booking?.reserved_from ?? null;
          if (startedAtRaw && mine.status === 'busy') {
            const startedMs = Date.parse(startedAtRaw);
            if (Number.isFinite(startedMs)) {
              const elapsedSec = Math.max(
                0,
                Math.floor((Date.now() - startedMs) / 1000),
              );
              // Only seed once — re-seeding on each poll would freeze
              // the visible counter on every 30s tick.
              setSeconds((curr) => (curr === 0 ? elapsedSec : curr));
            }
          }
        } else {
          setActivePc(null);
        }
      } catch {
        // Silent — UI keeps the last-known PC visible if offline.
      } finally {
        if (!cancelled) setHasLoadedOnce(true);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [myClientId]);

  // Derive the display strings. All computations are memo'd so the
  // re-renders from the 1Hz tick don't rebuild static UI nodes.
  const bookingRef = useMemo(() => {
    const id = activePc?.booking?.id;
    if (typeof id === 'number' && id > 0) {
      return `NXR-${String(id).padStart(6, '0')}`;
    }
    return 'NXR-—';
  }, [activePc?.booking?.id]);

  const timeRange = useMemo(
    () =>
      formatTimeRange(
        activePc?.booking?.reserved_from,
        activePc?.booking?.reserved_until,
      ),
    [activePc?.booking?.reserved_from, activePc?.booking?.reserved_until],
  );

  const seatLabel = useMemo(() => {
    const zoneName = activePc?.zone_name?.trim() || '—';
    const code = activePc?.code || '—';
    return `${zoneName} - ${code}`;
  }, [activePc?.zone_name, activePc?.code]);

  // Pre-session countdown — seconds remaining until reserved_from.
  // Recomputed every render so the 1Hz tick (when live) and the
  // 30s poll (when booked) both keep the value fresh enough; we
  // bias for simplicity over a separate dedicated interval.
  const [countdownTick, setCountdownTick] = useState(0);
  useEffect(() => {
    if (isLive || !activePc) return;
    const id = setInterval(() => {
      if (isForeground.current) setCountdownTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isLive, activePc]);

  const countdownSeconds = useMemo(() => {
    const startedAtRaw = activePc?.booking?.reserved_from;
    if (!startedAtRaw || isLive) return 0;
    const ms = Date.parse(startedAtRaw);
    if (!Number.isFinite(ms)) return 0;
    return Math.max(0, Math.floor((ms - Date.now()) / 1000));
    // countdownTick intentionally in deps so the value re-evaluates
    // every second once the timer starts ticking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePc?.booking?.reserved_from, isLive, countdownTick]);

  const elapsedLabel = useMemo(() => {
    const hh = Math.floor(seconds / 3600);
    const mm = Math.floor((seconds % 3600) / 60);
    const ss = seconds % 60;
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  }, [seconds]);

  const onEndSession = async () => {
    if (!activePc) {
      router.replace('/(tabs)');
      return;
    }
    // Mirror the action-row label: pre-session => "Cancel booking",
    // active session => "End session". Same handler routes through
    // unbookPc on the BE either way (which falls through to
    // booking-cancel when no Session row exists), so the only
    // difference is wording. Dialog labels are action-matched so
    // the confirm button verb echoes the title verb (operator-
    // reported: "why does 'Cancel booking' have 'Continue/Exit'
    // buttons" — pre-fix reused t.bookingExit.*).
    const live = activePc.status === 'busy';
    const ok = await dialog.confirm({
      title: live
        ? t.activeSession.confirmEndTitle
        : t.activeSession.confirmCancelTitle,
      message: live
        ? t.activeSession.confirmEndMessage
        : t.activeSession.confirmCancelMessage,
      confirmLabel: live
        ? t.activeSession.confirmYesEnd
        : t.activeSession.confirmYesCancel,
      cancelLabel: t.activeSession.confirmBack,
      destructive: true,
    });
    if (!ok) return;
    setEnding(true);
    try {
      await pcsApi.unbookPc(activePc.id);
      router.replace('/(tabs)');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setEnding(false);
    }
  };

  const handleCopyId = async () => {
    if (!activePc?.booking?.id) return;
    try {
      await Clipboard.setStringAsync(bookingRef);
      toast.success(t.bookingSuccess.copiedToast);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const clubName = activeMembership?.tenant_name ?? '—';
  const packageTitle = activePc?.booking?.package_title || '—';
  const depositAmount = activePc?.booking?.deposit_amount ?? 0;
  const totalLabel =
    depositAmount > 0
      ? `${formatSum(depositAmount)} ${t.common.currencyUnit}`
      : '—';

  const endActionLabel = isLive
    ? t.activeSession.endSession
    : t.activeSession.cancelBooking;

  const heroTitle = isLive
    ? t.activeSession.heroTitleLive
    : t.activeSession.heroTitleBooked;
  const heroSub = isLive
    ? t.activeSession.heroSubLive
    : t.activeSession.heroSubBooked;

  // Empty state — first poll finished but no PC matched. Pre-fix the
  // screen silently picked a stranger's busy PC and showed a
  // misleading elapsed timer; the empty state is the honest signal.
  const showEmpty = hasLoadedOnce && !activePc;

  return (
    <View style={styles.root}>
      <ImageBackground
        source={{ uri: Images.onboarding.heroArena }}
        style={styles.bg}
        imageStyle={{ opacity: 0.25 }}
      >
        <LinearGradient
          colors={['rgba(8,15,22,0.85)', 'rgba(8,15,22,0.95)', '#080F16']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <SimpleHeader title={t.activeSession.headerTitle} />

          {showEmpty ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconRing}>
                <CalendarIcon size={28} color="#8B95A8" />
              </View>
              <Text style={styles.emptyTitle}>
                {t.activeSession.noBookingTitle}
              </Text>
              <Text style={styles.emptySub}>{t.activeSession.noBookingSub}</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.replace('/(tabs)')}
                style={emptyCtaStyles.btn}
                accessibilityRole="button"
                accessibilityLabel={t.activeSession.noBookingCta}
              >
                <LinearGradient
                  colors={['#3B5BF5', '#8B3DF5']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={emptyCtaStyles.fill}
                >
                  <Text style={emptyCtaStyles.label} numberOfLines={1}>
                    {t.activeSession.noBookingCta}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Hero — green ring + check icon for booked state,
                  cyan/amber accent for live. Same shape as the
                  booking-success hero so users recognise it as the
                  "your reservation is real" signal. */}
              <View style={styles.heroWrap}>
                <View
                  style={[
                    styles.checkRing,
                    isLive && {
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.checkInner,
                      isLive && { backgroundColor: '#F59E0B' },
                    ]}
                  >
                    {isLive ? (
                      <GamepadIcon size={28} color={Colors.white} />
                    ) : (
                      <CheckIcon size={28} color={Colors.white} />
                    )}
                  </View>
                </View>
                <Text style={styles.heroTitle}>{heroTitle}</Text>
                <Text style={styles.heroSub}>{heroSub}</Text>
              </View>

              {/* Booking details card — mirrors booking-success.tsx.
                  Same field order so the user reads the same summary
                  they saw at checkout. */}
              <View style={styles.bookingCard}>
                <View style={styles.idRow}>
                  <Text style={styles.idLabel}>
                    {t.activeSession.detailBookingId}
                  </Text>
                  <View style={styles.idValueWrap}>
                    <Text style={styles.idValue}>{bookingRef}</Text>
                    <TouchableOpacity
                      hitSlop={8}
                      onPress={handleCopyId}
                      accessibilityRole="button"
                      accessibilityLabel={t.bookingSuccess.copyIdA11y}
                    >
                      <CopyIcon size={16} color="#8B95A8" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.divider} />

                <DetailRow
                  Icon={LocationPinIcon}
                  label={t.activeSession.detailClub}
                  value={clubName}
                />
                <DetailRow
                  Icon={GamepadIcon}
                  label={t.activeSession.detailZone}
                  value={seatLabel}
                />
                <DetailRow
                  Icon={CalendarIcon}
                  label={t.activeSession.detailTime}
                  value={timeRange}
                />
                <DetailRow
                  Icon={GiftIcon}
                  label={t.activeSession.detailPackage}
                  value={packageTitle}
                />
                <DetailRow
                  Icon={WalletIcon}
                  label={t.activeSession.detailTotal}
                  value={totalLabel}
                />
              </View>

              {/* QR — pre-session only. Once the session is live the
                  QR has served its purpose (staff opened the session)
                  and would only be visual noise. */}
              {!isLive && (
                <View style={styles.qrCard}>
                  <View style={styles.qrWrap}>
                    <QRCode
                      value={bookingRef}
                      size={140}
                      backgroundColor="#FFFFFF"
                      color="#000000"
                    />
                  </View>
                  <Text style={styles.qrText}>{t.activeSession.qrHint}</Text>
                </View>
              )}

              {/* Timer block — countdown to start when booked,
                  elapsed since session start when live. Single
                  component for layout consistency. */}
              <View style={styles.timerWrap}>
                <Text style={styles.timerLabel}>
                  {isLive
                    ? t.activeSession.elapsed
                    : t.activeSession.countdownLabel}
                </Text>
                <Text
                  style={[
                    styles.timerValue,
                    isLive && { color: '#F59E0B' },
                  ]}
                >
                  {isLive ? elapsedLabel : formatCountdown(countdownSeconds)}
                </Text>
              </View>

              {/* Balance card — surfaced here because the user often
                  checks it before deciding to extend / let the
                  session keep running. */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>
                  {t.activeSession.balanceLabel}
                </Text>
                <Text style={styles.balanceValue}>
                  {`${formatSum(activeMembership?.balance ?? 0)} ${t.common.currencyUnit}`}
                </Text>
              </View>

              {/* Primary destructive CTA — same row used pre-fix,
                  kept as a card-style action so it doesn't clash
                  with the booking-success-style summary above. */}
              <Text style={styles.sectionTitle}>
                {t.activeSession.quickActions}
              </Text>
              <ActionRow
                Icon={StopIcon}
                color="#EF4444"
                label={endActionLabel}
                onPress={onEndSession}
                danger
                disabled={ending}
              />
            </ScrollView>
          )}
        </SafeAreaView>

        <View
          style={[
            styles.subTabs,
            { paddingBottom: Math.max(insets.bottom, 14) },
          ]}
        >
          <SubTab
            label={t.activeSession.tabSession}
            Icon={GamepadIcon}
            active
          />
          <SubTab
            label={t.activeSession.tabServices}
            Icon={StaffIcon}
            onPress={() => router.push('/services')}
          />
          <SubTab
            label={t.activeSession.tabChat}
            Icon={MessageCircleIcon}
            onPress={() => toast.error(t.common.comingSoon)}
          />
          <SubTab
            label={t.activeSession.tabSettings}
            Icon={SettingsIcon}
            onPress={() => toast.error(t.common.comingSoon)}
          />
        </View>
      </ImageBackground>
    </View>
  );
}

/**
 * Countdown helper — same HH:MM:SS shape as elapsed so both timer
 * states render in a visually identical slot. Caps at 0 when the
 * start time has passed (the BE-side state flip from 'booked' →
 * 'busy' is what unblocks the elapsed view anyway).
 */
function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hh = Math.floor(safe / 3600);
  const mm = Math.floor((safe % 3600) / 60);
  const ss = safe % 60;
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

interface DetailRowProps {
  Icon: IconCmp;
  label: string;
  value: string;
}

function DetailRow({ Icon, label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Icon size={14} color="#00CFFF" />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

interface ActionProps {
  Icon: IconCmp;
  color: string;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function ActionRow({ Icon, color, label, onPress, danger, disabled }: ActionProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionRow,
        danger && styles.actionRowDanger,
        disabled && { opacity: 0.5 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${color}1F` }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={[styles.actionLabel, danger && { color: '#EF4444' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface SubTabProps {
  label: string;
  Icon: IconCmp;
  active?: boolean;
  onPress?: () => void;
}

function SubTab({ label, Icon, active, onPress }: SubTabProps) {
  const color = active ? '#00CFFF' : '#8B95A8';
  return (
    <TouchableOpacity onPress={onPress} style={styles.subTab} activeOpacity={0.7}>
      <Icon size={18} color={color} />
      <Text style={[styles.subTabText, active && styles.subTabTextActive]}>
        {label}
      </Text>
      {active && <View style={styles.subTabIndicator} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bg: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroWrap: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
    gap: 4,
  },
  checkRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.28)',
  },
  checkInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 20,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  heroSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  bookingCard: {
    backgroundColor: 'rgba(20, 24, 35, 0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.15)',
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  idLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
  },
  idValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idValue: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 14,
    color: Colors.text,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  detailLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    minWidth: 100,
  },
  detailValue: {
    flex: 1,
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: Colors.text,
    textAlign: 'right',
  },
  qrCard: {
    alignItems: 'center',
    marginTop: 18,
    gap: 10,
  },
  qrWrap: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
  },
  qrText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
  },
  timerWrap: {
    alignItems: 'center',
    marginTop: 22,
    gap: 4,
  },
  timerLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12,
    color: '#8B95A8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timerValue: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 32,
    color: '#00CFFF',
    letterSpacing: 2,
  },
  balanceCard: {
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    marginTop: 22,
  },
  balanceLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
  },
  balanceValue: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.text,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 22,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  actionRowDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 8,
  },
  emptyIconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(139, 149, 168, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.text,
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  subTabs: {
    flexDirection: 'row',
    backgroundColor: '#141823',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    paddingVertical: 4,
  },
  subTabText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11,
    color: '#8B95A8',
  },
  subTabTextActive: {
    color: '#00CFFF',
    fontFamily: Fonts.inter.semiBold,
  },
  subTabIndicator: {
    position: 'absolute',
    bottom: -10,
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#00CFFF',
  },
});

const emptyCtaStyles = StyleSheet.create({
  btn: {
    height: 48,
    borderRadius: 999,
    alignSelf: 'stretch',
    overflow: 'hidden',
    maxWidth: 240,
  },
  fill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    letterSpacing: 0.1,
  },
});
