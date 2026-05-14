import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, Share, Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { Images } from '../constants/Images';
import StepHeader from '../components/time/StepHeader';
import CountdownTimer from '../components/success/CountdownTimer';
import CheckIcon from '../components/icons/CheckIcon';
import LocationPinIcon from '../components/icons/LocationPinIcon';
import GamepadIcon from '../components/icons/GamepadIcon';
import CalendarIcon from '../components/icons/CalendarIcon';
import GiftIcon from '../components/icons/GiftIcon';
import WalletIcon from '../components/icons/WalletIcon';
import CopyIcon from '../components/icons/CopyIcon';
import NavigationIcon from '../components/icons/NavigationIcon';
import ShareIcon from '../components/icons/ShareIcon';
import Button from '../components/common/Button';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../store/AuthProvider';
import { getErrorMessage } from '../lib/api/client';
import { clearBookingSelections } from '../lib/state/bookingFlow';

function formatSum(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('ru-RU').replace(/,/g, ' ');
}

function formatTimeRange(start: string, durationHours: number): string {
  if (!start) return '';
  const [hh, mm] = start.split(':').map((p) => Number(p));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return start;
  const endHour = (hh + Math.max(1, Math.round(durationHours))) % 24;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)} - ${pad(endHour)}:${pad(mm)}`;
}

export default function BookingSuccessScreen() {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { clubs, currentTenantId } = useAuth();

  // Read everything from the params the payment screen forwarded. We
  // never show a hardcoded "Nexora Arena Koramangala / A08 / 20 000
  // so'm" mock any more — that confirmation lied about every real
  // booking and the QR code was the literal string "NXR-27836".
  const params = useLocalSearchParams<{
    clubName?: string;
    seatCode?: string;
    zoneLabel?: string;
    packageTitle?: string;
    startTime?: string;
    durationHours?: string;
    totalAmount?: string;
    bookingId?: string;
  }>();

  // Wipe the in-memory zone/seat selections now that the booking is
  // confirmed. The next time the user starts a booking, zone-select
  // and seat-select will render with no pre-highlights — matching the
  // pre-fix UX intent without leaving the state stuck for the rest of
  // the session.
  useEffect(() => {
    clearBookingSelections();
  }, []);

  const fallbackClubName =
    clubs.find((c) => c.tenant_id === currentTenantId)?.tenant_name ?? '';
  const clubName = params.clubName || fallbackClubName;
  const duration = params.durationHours ? Number(params.durationHours) : 1;
  const total = params.totalAmount ? Number(params.totalAmount) : 0;
  const timeRange = formatTimeRange(params.startTime ?? '', duration);
  const bookingId = params.bookingId || 'NXR-PENDING';
  const seatCode = params.seatCode || '—';
  const zoneLabel = params.zoneLabel
    ? `${t.bookingSuccess.detailZone}: ${params.zoneLabel.toUpperCase()} - ${seatCode}`
    : seatCode;

  // Seconds remaining until the booked slot starts. If the user
  // already passed the start time the countdown sits at 0 — which
  // matches reality (the booking window is now). Pre-fix the inner
  // countdown defaulted to a fake "47:32" that meant nothing.
  const countdownInitial = (() => {
    if (!params.startTime) return 0;
    const [hh, mm] = String(params.startTime).split(':').map((p) => Number(p));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
    const target = new Date();
    target.setHours(hh, mm, 0, 0);
    if (target.getTime() < Date.now()) target.setDate(target.getDate() + 1);
    return Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
  })();

  // Resolve the active club's geolocation so the Direction button can
  // open the right pin (not just "search Nexora Arena"). Falls back to
  // the club name when coords are missing.
  const activeClub = clubs.find((c) => c.tenant_id === currentTenantId);
  const clubLat = (activeClub as { lat?: number } | undefined)?.lat;
  const clubLng = (activeClub as { lng?: number } | undefined)?.lng;

  // Copy booking ID → clipboard. Critical post-payment step — staff
  // at the desk often ask "what's your booking ID" and the user
  // re-reading it off the QR is fiddly. Pre-fix (audit HIGH) the tap
  // did nothing.
  const handleCopyId = async () => {
    try {
      await Clipboard.setStringAsync(bookingId);
      toast.success(t.bookingSuccess.copiedToast);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  // External-maps handoff. We don't switch this one into the in-app
  // navigator because the user is already past discover — by the time
  // they hit booking-success they want a quick handoff to their
  // preferred maps app for the drive.
  const handleDirection = async () => {
    if (!clubName) {
      toast.error(t.bookingSuccess.directionMissingClub);
      return;
    }
    const label = encodeURIComponent(clubName);
    const url =
      typeof clubLat === 'number' && typeof clubLng === 'number'
        ? Platform.select({
            ios: `maps:0,0?q=${label}@${clubLat},${clubLng}`,
            android: `geo:${clubLat},${clubLng}?q=${clubLat},${clubLng}(${label})`,
            default: `https://maps.google.com/?q=${clubLat},${clubLng}`,
          })!
        : Platform.select({
            ios: `maps:0,0?q=${label}`,
            android: `geo:0,0?q=${label}`,
            default: `https://maps.google.com/?q=${label}`,
          })!;
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error('not_supported');
      await Linking.openURL(url);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  // Native share sheet — same pattern as ClubHero. The message
  // includes the booking ID + a human-readable time so anyone the
  // user shares with (parent, friend) understands what they're
  // looking at without having to open the app.
  const handleShare = async () => {
    const lines = [
      t.bookingSuccess.shareTitle,
      clubName ? `📍 ${clubName}` : '',
      timeRange ? `🕒 ${timeRange}` : '',
      params.packageTitle ? `🎮 ${params.packageTitle}` : '',
      `🎟 ${bookingId}`,
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  // Calendar handoff. expo-calendar would give us per-platform native
  // calendar writes, but that requires an additional dependency +
  // permission prompt. Until we add it, we open the cross-platform
  // Google Calendar template URL — every OS routes that to its native
  // calendar with the event pre-populated. Works on iOS, Android, web.
  const handleAddToCalendar = async () => {
    if (!params.startTime) {
      toast.error(t.bookingSuccess.calendarMissingTime);
      return;
    }
    const [hh, mm] = String(params.startTime).split(':').map((p) => Number(p));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
      toast.error(t.bookingSuccess.calendarMissingTime);
      return;
    }
    const start = new Date();
    start.setHours(hh, mm, 0, 0);
    if (start.getTime() < Date.now()) start.setDate(start.getDate() + 1);
    const end = new Date(start.getTime() + Math.max(1, Math.round(duration)) * 3600_000);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = encodeURIComponent(`${t.bookingSuccess.calendarTitlePrefix} ${clubName || ''}`.trim());
    const details = encodeURIComponent(
      [`Booking: ${bookingId}`, params.packageTitle, zoneLabel].filter(Boolean).join('\n'),
    );
    const url =
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${title}` +
      `&dates=${fmt(start)}/${fmt(end)}` +
      `&details=${details}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const BOOKING_DETAILS = [
    { Icon: LocationPinIcon, label: t.bookingSuccess.detailClub, value: clubName || '—' },
    { Icon: GamepadIcon, label: t.bookingSuccess.detailZone, value: zoneLabel },
    {
      Icon: CalendarIcon,
      label: t.bookingSuccess.detailTime,
      value: timeRange || t.bookingSuccess.detailTimeFallback,
    },
    {
      Icon: GiftIcon,
      label: t.bookingSuccess.detailPackage,
      value: params.packageTitle || '—',
    },
    {
      Icon: WalletIcon,
      label: t.bookingSuccess.detailTotal,
      value: total > 0 ? `${formatSum(total)} ${t.common.currencyUnit}` : '—',
    },
  ];

  return (
    <View style={styles.root}>
      <ImageBackground
        // Reuses the onboarding hero arena photo as a subtle backdrop
        // (30% opacity) so the success card sits on a branded surface
        // rather than a flat dark void. The image key was renamed from
        // `cyberCity` → `heroArena` during the onboarding professional
        // redesign — kept the same Unsplash asset, just a clearer name.
        source={{ uri: Images.onboarding.heroArena }}
        style={styles.bg}
        imageStyle={{ opacity: 0.3 }}
      >
        <LinearGradient
          colors={['rgba(8,15,22,0.85)', 'rgba(8,15,22,0.95)', '#080F16']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView edges={['top']}>
          <StepHeader
            step={t.bookingSuccess.headerStep}
            title={t.bookingSuccess.headerTitle}
            showBack={false}
          />
        </SafeAreaView>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successWrap}>
            <View style={styles.checkRing}>
              <View style={styles.checkInner}>
                <CheckIcon size={32} color={Colors.white} />
              </View>
            </View>
            <Text style={styles.successTitle}>{t.bookingSuccess.title}</Text>
            <Text style={styles.successSubtitle}>{t.bookingSuccess.subtitle}</Text>
          </View>

          <View style={styles.bookingCard}>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>{t.bookingSuccess.bookingId}</Text>
              <View style={styles.idValueWrap}>
                <Text style={styles.idValue}>{bookingId}</Text>
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

            {BOOKING_DETAILS.map(({ Icon, label, value }, idx) => (
              <View key={idx} style={styles.detailRow}>
                <Icon size={14} color="#00CFFF" />
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.qrCard}>
            <View style={styles.qrWrap}>
              <QRCode
                value={bookingId}
                size={140}
                backgroundColor="#FFFFFF"
                color="#000000"
              />
            </View>
            <Text style={styles.qrText}>{t.bookingSuccess.qrHint}</Text>
          </View>

          <CountdownTimer initialSeconds={countdownInitial} />

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={handleDirection}
              accessibilityRole="button"
              accessibilityLabel={t.bookingSuccess.actionDirection}
            >
              <NavigationIcon size={16} color="#00CFFF" />
              <Text style={styles.actionText}>{t.bookingSuccess.actionDirection}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel={t.bookingSuccess.actionShare}
            >
              <ShareIcon size={16} color="#8B95A8" />
              <Text style={styles.actionText}>{t.bookingSuccess.actionShare}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={handleAddToCalendar}
              accessibilityRole="button"
              accessibilityLabel={t.bookingSuccess.actionCalendar}
            >
              <CalendarIcon size={16} color="#8B95A8" />
              <Text style={styles.actionText}>{t.bookingSuccess.actionCalendar}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button
            label={t.bookingSuccess.homeBtn}
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </ImageBackground>
    </View>
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
    paddingBottom: 16,
  },
  successWrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 22,
    gap: 6,
  },
  checkRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(0, 207, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(0, 207, 255, 0.3)',
  },
  checkInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  successSubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
    color: '#8B95A8',
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
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(20, 24, 35, 0.85)',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  actionText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12,
    color: Colors.text,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
