import { ComponentType, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import StepHeader from '../components/time/StepHeader';
import PackageCard from '../components/time/PackageCard';
import PackageIcon from '../components/icons/PackageIcon';
import GiftIcon from '../components/icons/GiftIcon';
import MoonIcon from '../components/icons/MoonIcon';
import CrownIcon from '../components/icons/CrownIcon';
import CalendarIcon from '../components/icons/CalendarIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import * as packagesApi from '../lib/api/services/packages';
import type { PackageItem, BookingSlot } from '../lib/api/services/packages';
import { useSelectedZone } from '../lib/state/useSelectedZone';
import WalletIcon from '../components/icons/WalletIcon';

function formatPriceLabel(amount: number, unit: string): string {
  return `${amount.toLocaleString('ru-RU').replace(/,/g, ' ')} ${unit}`;
}

/**
 * Sentinel id for the "pay from club balance" pseudo-package. The
 * time-select package list mixes this synthetic card with real
 * BE-served packages so the user can opt into hourly billing from
 * the same picker. The value is intentionally negative so it can't
 * collide with a real packages.id (which is always positive
 * auto-increment). The continue handler short-circuits on this id
 * and forwards an empty packageId to /payment, which then uses its
 * zone-price × duration fallback for balance billing.
 */
const BALANCE_PSEUDO_ID = -1;

/**
 * Pick an icon + colour scheme for a package based on its duration.
 *
 * Pre-fix the FE hardcoded 4 packages each with its own icon. Now the
 * package list comes from the BE (per-tenant catalog), so we map
 * incoming rows to one of a fixed palette. Bucketing by duration is
 * the most stable signal — operators tend to label packages
 * "1 soat" / "3 soat" / "Tungi" / "Premium" but the durations are
 * the structural truth. Falls back to the package icon if nothing
 * matches.
 */
function pickIcon(pkg: PackageItem): {
  Icon: ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  iconBgColor: string;
} {
  const hours = pkg.duration_min / 60;
  // Night packages: 5h+ duration AND name hints (heuristic — exact
  // matching would force operators into specific naming conventions).
  const nameLower = (pkg.name + ' ' + pkg.description).toLowerCase();
  const isNight = /tun|night|ноч/.test(nameLower);
  const isPremium = /premium|vip|luks/.test(nameLower);

  if (isNight && hours >= 5) {
    return { Icon: MoonIcon, iconColor: '#3B82F6', iconBgColor: 'rgba(59, 130, 246, 0.15)' };
  }
  if (isPremium) {
    return { Icon: CrownIcon, iconColor: '#F59E0B', iconBgColor: 'rgba(245, 158, 11, 0.15)' };
  }
  if (hours >= 2 && hours < 5) {
    return { Icon: GiftIcon, iconColor: '#7C3AED', iconBgColor: 'rgba(124, 58, 237, 0.15)' };
  }
  return { Icon: PackageIcon, iconColor: '#00CFFF', iconBgColor: 'rgba(0, 207, 255, 0.12)' };
}

export default function TimeSelectScreen() {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  // Numeric BE zone id, written by seat-select once it resolves the
  // FE-category bucket to a specific BE zone row. We forward this to
  // listBookingSlots so peak-pricing windows scope correctly to the
  // user's actual zone — pre-fix the slot list always used the
  // tenant's default windows, missing zone-specific surcharges.
  // Audit finding #10.
  const { beZoneId } = useSelectedZone();

  // `selectedPackageId` is either a real BE package id, BALANCE_PSEUDO_ID
  // for hourly-from-balance, or null for "nothing picked yet".
  // Default to the balance option so a user who lands on this screen
  // sees a sensible default highlighted instead of "nothing chosen".
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
    BALANCE_PSEUDO_ID,
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Real BE data — replaces the previously hardcoded `PACKAGES` array
  // and `TIME_SLOTS` constant. Loaded once on mount; the slots payload
  // depends on the chosen package's duration so it's refreshed when
  // `selectedPackageId` changes.
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  // `slotsDate` is the BE-provided YYYY-MM-DD that the rendered slots
  // belong to. Pre-fix the FE assumed "today" everywhere downstream
  // (payment.tsx rebuilt start_at as `today + hh:mm`) — if the user
  // lingered past midnight or the BE rolled the slot list forward to
  // tomorrow, the two date assumptions diverged and the user got
  // booked on the wrong day. Carrying the BE date forward through
  // the booking flow is the fix. Audit finding #6.
  const [slotsDate, setSlotsDate] = useState<string | null>(null);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Fetch the package catalog on mount.
  useEffect(() => {
    let cancelled = false;
    setPackagesLoading(true);
    packagesApi
      .listPackages()
      .then((list) => {
        if (cancelled) return;
        setPackages(list);
        // Leave the default selection on the balance option. The
        // user can switch to a package if they want fixed-price
        // billing; otherwise hourly-from-balance is a safe default
        // (no upfront commit, no surprise charges).
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(getErrorMessage(e));
        setPackages([]);
      })
      .finally(() => {
        if (!cancelled) setPackagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selected package object — derived. Used to feed the slots request
  // with the right duration so a 3-hour package doesn't show slots
  // that don't fit before close. `null` when the user picked the
  // balance pseudo-option; downstream code uses the default 60-min
  // duration for slot scoping and forwards an empty packageId to
  // /payment so it runs balance billing instead of a package-pinned
  // booking.
  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? null,
    [packages, selectedPackageId],
  );
  const isBalanceMode = selectedPackageId === BALANCE_PSEUDO_ID;

  // Fetch slots whenever the selected option changes. Balance mode
  // uses a 60-minute default duration for slot scoping; package
  // mode uses the package's own duration so the BE can drop slots
  // that don't fit before closing time.
  useEffect(() => {
    if (!selectedPackage && !isBalanceMode) {
      setSlots([]);
      return;
    }
    const durationMin = selectedPackage?.duration_min ?? 60;
    let cancelled = false;
    setSlotsLoading(true);
    packagesApi
      .listBookingSlots({
        durationMin,
        // Numeric BE zone id when seat-select has resolved it (which
        // it has, since the booking flow runs zone → seat → time).
        // Without it the BE returns slots scoped to the tenant's
        // default pricing windows; with it, slots are scoped to the
        // user's specific zone — so a "VIP zone" peak surcharge
        // shows up only when the user actually picked a VIP seat.
        zoneId: beZoneId ?? null,
      })
      .then((res) => {
        if (cancelled) return;
        setSlots(res.slots);
        // Record the BE-supplied date alongside the slots so payment
        // can build start_at without re-guessing "today vs tomorrow".
        setSlotsDate(res.date || null);
        // Drop a previously-selected time that's no longer in the
        // new slot list (e.g. user picked 14:00 with a 1h package,
        // then switched to a 4h package whose latest slot is 12:00).
        if (selectedTime && !res.slots.some((s) => s.time === selectedTime)) {
          setSelectedTime(null);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(getErrorMessage(e));
        setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPackage?.id, isBalanceMode]);

  const currency = t.common.currencyUnit;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StepHeader step={t.timeSelect.headerStep} title={t.timeSelect.headerTitle} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t.timeSelect.title}</Text>

        {/* Balance / hourly-billing pseudo-card. Always rendered
            first regardless of whether the tenant has packages —
            the user has a balance topup option even at clubs that
            haven't published any packages yet. */}
        <PackageCard
          Icon={WalletIcon}
          iconColor="#22C55E"
          iconBgColor="rgba(34, 197, 94, 0.15)"
          title={t.timeSelect.balanceOptionTitle}
          subtitle={t.timeSelect.balanceOptionSub}
          price={t.timeSelect.balanceOptionPrice}
          selected={isBalanceMode}
          onPress={() => setSelectedPackageId(BALANCE_PSEUDO_ID)}
        />

        {packagesLoading ? (
          <View style={styles.loaderBlock}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : packages.length === 0 ? (
          // Empty-packages state is informational only now — the
          // balance card above still gives the user a way forward.
          // Keep the copy as a hint about future tenant packages.
          <View style={[styles.emptyCard, styles.emptyCardSmall]}>
            <Text style={styles.emptySub}>{t.timeSelect.noPackagesSub}</Text>
          </View>
        ) : (
          packages.map((p) => {
            const { Icon, iconColor, iconBgColor } = pickIcon(p);
            return (
              <PackageCard
                key={p.id}
                Icon={Icon}
                iconColor={iconColor}
                iconBgColor={iconBgColor}
                title={p.name}
                subtitle={p.description || `${Math.round(p.duration_min / 60)} ${t.timeSelect.hoursSuffix}`}
                price={formatPriceLabel(p.price, currency)}
                selected={selectedPackageId === p.id}
                onPress={() => setSelectedPackageId(p.id)}
              />
            );
          })
        )}

        <Text style={styles.sectionTitle}>{t.timeSelect.timeLabel}</Text>

        <Pressable style={styles.dateButton}>
          <Text style={styles.dateText}>{t.timeSelect.todayLabel}</Text>
          <CalendarIcon size={18} color="#8B95A8" />
        </Pressable>

        {slotsLoading ? (
          <View style={styles.loaderBlock}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : slots.length === 0 ? (
          <View style={[styles.emptyCard, styles.emptyCardSmall]}>
            <Text style={styles.emptySub}>{t.timeSelect.noSlotsSub}</Text>
          </View>
        ) : (
          <>
            <View style={styles.timeRow}>
              {slots.map((slot) => {
                const isActive = selectedTime === slot.time;
                return (
                  <Pressable
                    key={slot.time}
                    style={[
                      styles.timeSlot,
                      isActive && styles.timeSlotActive,
                      slot.is_peak && !isActive && styles.timeSlotPeak,
                    ]}
                    onPress={() => setSelectedTime(slot.time)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={slot.time + (slot.is_peak ? ` (${t.timeSelect.peakLabel})` : '')}
                  >
                    <Text style={[styles.timeText, isActive && styles.timeTextActive]}>
                      {slot.time}
                    </Text>
                    {slot.is_peak && <View style={styles.peakDot} />}
                  </Pressable>
                );
              })}
            </View>
            {/* Peak banner — surfaces ONLY when the user picks a peak
                slot. Industry convention (cinemas, gym, gaming
                cafes): packages are flat-rate, peak windows apply to
                hourly bookings. The package the user paid for is
                still valid during peak — but it's worth telling them
                they're in a high-demand window so they don't show
                up expecting the same crowd as off-peak. */}
            {selectedTime && slots.find((s) => s.time === selectedTime)?.is_peak && (
              <View style={styles.peakBanner}>
                <View style={styles.peakBannerDot} />
                <Text style={styles.peakBannerText}>{t.timeSelect.peakHint}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Continue CTA — full lg pill. Gated on both a package
            AND a slot being chosen because forwarding to payment
            without either leaves a half-built selection downstream.
            Tap-handler is inline so the route push still has access
            to the selectedPackage / selectedTime closure values. */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            if (!selectedTime) return;
            if (!isBalanceMode && !selectedPackage) return;
            // Balance mode forwards empty package fields — /payment
            // recognises the missing packageId / priceAmount /
            // durationHours and falls back to zone-price × default
            // duration for the subtotal, billing hourly from the
            // user's club balance instead of pinning the booking to
            // a package row.
            const params = isBalanceMode
              ? {
                  packageId: '',
                  packageTitle: '',
                  priceAmount: '',
                  durationHours: '1',
                  startTime: selectedTime,
                  startDate: slotsDate ?? '',
                }
              : {
                  packageId: String(selectedPackage!.id),
                  packageTitle: selectedPackage!.name,
                  priceAmount: String(selectedPackage!.price),
                  durationHours: String(
                    Math.max(1, Math.round(selectedPackage!.duration_min / 60)),
                  ),
                  startTime: selectedTime,
                  startDate: slotsDate ?? '',
                };
            router.push({ pathname: '/payment', params });
          }}
          disabled={!selectedTime || (!isBalanceMode && !selectedPackage)}
          accessibilityRole="button"
          accessibilityLabel={t.timeSelect.continue}
          accessibilityState={{
            disabled: !selectedTime || (!isBalanceMode && !selectedPackage),
          }}
          style={[
            continueBtnStyles.btn,
            (!selectedTime || (!isBalanceMode && !selectedPackage)) &&
              continueBtnStyles.btnDisabled,
          ]}
        >
          <LinearGradient
            colors={['#3B5BF5', '#8B3DF5']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={continueBtnStyles.fill}
          >
            <Text
              style={continueBtnStyles.label}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {t.timeSelect.continue}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 24,
    marginBottom: 10,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141823',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  dateText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13.5,
    color: Colors.text,
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  timeSlot: {
    minWidth: 64,
    flexGrow: 1,
    flexBasis: '18%',
    height: 44,
    borderRadius: 10,
    backgroundColor: '#141823',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 8,
  },
  timeSlotActive: {
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    borderColor: '#00CFFF',
  },
  timeSlotPeak: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  timeText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#8B95A8',
  },
  timeTextActive: {
    color: '#00CFFF',
  },
  peakDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  peakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  peakBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  peakBannerText: {
    flex: 1,
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#F59E0B',
    lineHeight: 17,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  loaderBlock: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  emptyCardSmall: {
    padding: 16,
    marginTop: 10,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 18,
  },
});

// Inline continue-CTA styles — 52pt lg pill at the bottom of the
// booking-flow step. Disabled until BOTH a package and a slot are
// picked; the booking flow won't make sense without both upstream.
const continueBtnStyles = StyleSheet.create({
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
