import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { Images } from '../../constants/Images';
import { useLocale, useT } from '../../lib/i18n/LocaleProvider';
import { useToast } from '../../components/common/Toast';
import { useDialog } from '../../components/common/AppDialog';
import { getErrorMessage } from '../../lib/api/client';
import RefreshIcon from '../../components/icons/RefreshIcon';
import ClockIcon from '../../components/icons/ClockIcon';
import CheckIcon from '../../components/icons/CheckIcon';
import Button from '../../components/common/Button';
import * as bookingsApi from '../../lib/api/services/bookings';
import * as pcsApi from '../../lib/api/services/pcs';

interface Booking {
  id: string;
  date: string;
  month: string;
  club: string;
  time: string;
  zone: string;
  durationHours: number;
  status: 'confirmed' | 'completed';
  image: string;
}

// UPCOMING / PAST mock arrays were removed. The screen now relies
// entirely on `bookingsApi.listUpcoming()` / `listHistory()` and
// renders the empty-state card when the API returns no rows. The
// initial useState seed is `[]` so a stale device cache can't flash
// fake bookings before the fetch completes.

// Helpers to bridge backend Booking shape (ISO timestamps) -> the UI's
// pre-existing card shape (date/month/time strings).
//
// `localeTag` lets the month abbreviation follow the active app locale.
// Pre-fix this was hardcoded to `'en-US'` — every uz/ru user saw English
// "Jan / Feb / …" on every booking card, even though the rest of the
// app was localised. Audit finding M2.
function shapeApiBooking(b: bookingsApi.Booking, localeTag: string): Booking {
  const start = new Date(b.start_at);
  const end = new Date(b.end_at);
  const pad = (n: number) => String(n).padStart(2, '0');
  // Some Android RN runtimes don't ship the full Intl data for every
  // locale tag — fall back to the device default if toLocaleString
  // throws. Better to surface ANY abbreviation than crash the card.
  let monthLabel: string;
  try {
    monthLabel = start.toLocaleString(localeTag, { month: 'short' });
  } catch {
    monthLabel = start.toLocaleString(undefined, { month: 'short' });
  }
  return {
    id: String(b.id),
    date: pad(start.getDate()),
    month: monthLabel,
    club: b.tenant_name || '—',
    time: `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`,
    zone: b.zone_name || b.pc_code || '',
    durationHours: b.duration_hours,
    status: b.status === 'completed' ? 'completed' : 'confirmed',
    image: b.cover_url || Images.clubs[0],
  };
}

// Map the FE locale enum to a real BCP-47 tag for Intl.DateTimeFormat.
// `'uz'` alone works on most modern devices but ru/en need the
// region-tagged form on older Android runtimes (pre-API 28) for the
// short-month label to localise correctly.
const LOCALE_TO_INTL_TAG: Record<string, string> = {
  uz: 'uz-UZ',
  ru: 'ru-RU',
  en: 'en-US',
};

export default function BookingsScreen() {
  const t = useT();
  const toast = useToast();
  const dialog = useDialog();
  const { locale } = useLocale();
  const localeTag = LOCALE_TO_INTL_TAG[locale] ?? 'en-US';
  const [tab, setTab] = useState(0);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Track the booking id currently being cancelled — disables the
  // row's Cancel button + dims it so the user can't double-tap during
  // the round-trip. Tracking by id (not a single boolean) lets us
  // disable only the row being cancelled if a user somehow taps two
  // different bookings in quick succession.
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  /**
   * Cancel a confirmed booking. Pre-fix this CTA didn't exist — users
   * could create a reservation but had no way to drop it from the app
   * (only by walking into the club). The BE has had the route ready
   * (`DELETE /mobile/bookings/{id}` enforces the 1h-buffer policy +
   * frees up the PC) and `bookingsApi.cancelBooking` was implemented;
   * the FE just never surfaced it. Audit finding #1.
   *
   * Lifecycle:
   *   1. Confirm dialog explains the 1h-buffer + irreversibility.
   *   2. Optimistic local removal so the row disappears instantly.
   *   3. BE call. On failure we re-fetch the full list so the row
   *      reappears (BE rejected — booking still active).
   *   4. PC cache cleared on success so the next zone-/seat-select
   *      read shows the freed PC immediately.
   */
  const cancelBooking = useCallback(
    async (b: Booking) => {
      if (cancellingId) return; // dedupe taps during the round-trip
      const ok = await dialog.confirm({
        title: t.bookings.cancelConfirmTitle,
        message: t.bookings.cancelConfirmMessage,
        confirmLabel: t.bookings.cancelConfirmBtn,
        cancelLabel: t.bookings.cancelKeepBtn,
        destructive: true,
      });
      if (!ok) return;
      setCancellingId(b.id);
      // Optimistic local removal — pre-fix the row stayed visible
      // for the duration of the network round-trip, which felt
      // unresponsive on slow networks.
      setUpcoming((prev) => prev.filter((row) => row.id !== b.id));
      try {
        await bookingsApi.cancelBooking(Number(b.id));
        // PC catalogue cache must drop so the freed PC shows as
        // 'free' on subsequent zone-/seat-select reads (the user's
        // most likely next action after cancelling — make a new
        // booking).
        pcsApi.invalidatePcsCache();
        toast.success(t.bookings.cancelSuccess);
      } catch (e) {
        // BE refused — most commonly the 1h-buffer rejection. Roll
        // back the optimistic removal by reloading the upcoming list
        // (cheaper than re-inserting at the right sort position).
        toast.error(getErrorMessage(e));
        try {
          const upcomingRes = await bookingsApi.listUpcoming();
          setUpcoming(upcomingRes.map((b) => shapeApiBooking(b, localeTag)));
        } catch {
          // If the reload also fails the user can pull-to-refresh.
        }
      } finally {
        setCancellingId(null);
      }
    },
    [dialog, t, toast, cancellingId, localeTag],
  );

  const list = tab === 0 ? upcoming : past;

  const TABS = useMemo(
    () => [t.bookings.tabUpcoming, t.bookings.tabHistory],
    [t]
  );

  // Always overwrite with the API result, even when empty — the empty
  // case is itself a valid signal ("no bookings yet") and the empty-
  // state UI handles it. Previously we kept the last successful list
  // around so a switch from a tenant-with-bookings to one without
  // would briefly show stale rows on the empty tenant; clearing on
  // each fetch fixes that.
  const loadBookings = useCallback(async () => {
    setRefreshing(true);
    try {
      const [upcomingRes, pastRes] = await Promise.allSettled([
        bookingsApi.listUpcoming(),
        bookingsApi.listHistory(),
      ]);
      if (upcomingRes.status === 'fulfilled') {
        setUpcoming(upcomingRes.value.map((b) => shapeApiBooking(b, localeTag)));
      }
      if (pastRes.status === 'fulfilled') {
        setPast(pastRes.value.map((b) => shapeApiBooking(b, localeTag)));
      }
      // Surface a single toast if EITHER call failed. We avoid two
      // separate toasts when both fail (the underlying issue is the
      // same network drop) — the user sees one banner per refresh.
      const firstFailure =
        upcomingRes.status === 'rejected'
          ? upcomingRes.reason
          : pastRes.status === 'rejected'
            ? pastRes.reason
            : null;
      if (firstFailure) {
        toast.error(getErrorMessage(firstFailure));
      }
    } finally {
      setRefreshing(false);
    }
  }, [toast, localeTag]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{t.bookings.title}</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          activeOpacity={0.7}
          onPress={loadBookings}
          disabled={refreshing}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t.common.retry}
        >
          <RefreshIcon size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {TABS.map((label, i) => {
          const isActive = tab === i;
          return (
            <Pressable
              key={label}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setTab(i)}
            >
              <Text
                style={[styles.tabText, isActive && styles.tabTextActive]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadBookings}
            tintColor="#00CFFF"
          />
        }
      >
        <Text style={styles.sectionTitle}>
          {tab === 0 ? t.bookings.sectionUpcoming : t.bookings.sectionHistory}
        </Text>

        {list.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>{t.bookings.emptyTitle}</Text>
            <Text style={styles.emptySub}>{t.bookings.emptySub}</Text>
          </View>
        ) : (
          list.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.bookingCard}
              activeOpacity={0.85}
              // Only confirmed (upcoming) bookings push into the live
              // session view, and the bookingId travels along so the
              // active-session screen can scope to a specific row
              // instead of "any busy PC" (audit HIGH — pre-fix every
              // booking card pushed to /active-session regardless of
              // which one was tapped, so two parallel bookings were
              // indistinguishable). Completed history rows are
              // read-only — tapping them is a no-op until a
              // booking-details screen exists.
              disabled={b.status !== 'confirmed'}
              onPress={() => {
                if (b.status !== 'confirmed') return;
                router.push({
                  pathname: '/active-session',
                  params: { bookingId: b.id },
                });
              }}
              accessibilityRole={b.status === 'confirmed' ? 'button' : undefined}
              accessibilityLabel={
                b.status === 'confirmed'
                  ? `${b.club} · ${b.time}`
                  : undefined
              }
            >
              <View style={styles.dateBox}>
                <Text style={styles.dateNum}>{b.date}</Text>
                <Text style={styles.dateMonth}>{b.month}</Text>
              </View>
              <View style={styles.bookingInfo}>
                <View style={styles.bookingTop}>
                  <Text style={styles.clubName} numberOfLines={1}>{b.club}</Text>
                  {/* Per-booking rating chip removed: the booking row
                      shape doesn't carry rating, and the "4.8" we used
                      to show was the same fixture value on every row
                      — pretending each booked club has the same rating.
                      Re-enable when the BE returns a club-rating field
                      on the booking response (Booking.club.rating). */}
                </View>
                <Text style={styles.bookingTime}>{b.time} · {b.zone}</Text>
                <View style={styles.bookingBottom}>
                  <View style={styles.durationWrap}>
                    <ClockIcon size={11} color="#8B95A8" />
                    <Text style={styles.duration}>
                      {t.bookings.durationHours.replace('{n}', String(b.durationHours))}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          b.status === 'confirmed'
                            ? 'rgba(34, 197, 94, 0.12)'
                            : 'rgba(139, 149, 168, 0.15)',
                      },
                    ]}
                  >
                    {b.status === 'confirmed' ? (
                      <View style={styles.dot} />
                    ) : (
                      <CheckIcon size={10} color="#8B95A8" />
                    )}
                    <Text
                      style={[
                        styles.statusText,
                        { color: b.status === 'confirmed' ? '#22C55E' : '#8B95A8' },
                      ]}
                    >
                      {b.status === 'confirmed' ? t.bookings.statusConfirmed : t.bookings.statusCompleted}
                    </Text>
                  </View>
                </View>
                {/* Cancel CTA only on confirmed (upcoming) bookings.
                    Tapping the link triggers a destructive-confirm
                    dialog → BE DELETE → local optimistic removal +
                    PC cache invalidation. Pre-fix this CTA was
                    missing entirely so users had no way to drop a
                    booking from the app. Audit finding #1. */}
                {b.status === 'confirmed' && (
                  <Pressable
                    style={styles.cancelLink}
                    onPress={() => cancelBooking(b)}
                    disabled={cancellingId === b.id}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t.bookings.cancelBtn}
                    accessibilityState={{ disabled: cancellingId === b.id }}
                  >
                    <Text
                      style={[
                        styles.cancelLinkText,
                        cancellingId === b.id && styles.cancelLinkTextDim,
                      ]}
                    >
                      {t.bookings.cancelBtn}
                    </Text>
                  </Pressable>
                )}
              </View>
              <Image source={{ uri: b.image }} style={styles.bookingImage} />
            </TouchableOpacity>
          ))
        )}

        {/* Download-receipts button removed: BE has no /bookings/{id}/receipt
            route yet. Re-add when bookings.getReceipt() lights up. */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    color: Colors.text,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 4,
    height: 42,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#1F2533',
  },
  tabText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#8B95A8',
  },
  tabTextActive: {
    color: Colors.text,
    fontFamily: Fonts.inter.semiBold,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 10,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
    textAlign: 'center',
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  dateBox: {
    width: 44,
    alignItems: 'center',
  },
  dateNum: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    color: Colors.text,
  },
  dateMonth: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11,
    color: '#8B95A8',
  },
  bookingInfo: {
    flex: 1,
    gap: 4,
  },
  bookingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  clubName: {
    flex: 1,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11,
    color: '#F59E0B',
  },
  bookingTime: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#8B95A8',
  },
  bookingBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  durationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  duration: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11,
    color: '#8B95A8',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 10.5,
  },
  // Cancel CTA — left-aligned link below the status pill. Tinted red
  // so the user knows it's destructive without a heavy button frame
  // (a full red button would dominate the booking card visually).
  cancelLink: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    marginTop: 2,
  },
  cancelLinkText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11.5,
    color: '#EF4444',
  },
  cancelLinkTextDim: {
    color: 'rgba(239, 68, 68, 0.45)',
  },
  bookingImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  downloadBtnWrap: {
    marginTop: 12,
  },
});
