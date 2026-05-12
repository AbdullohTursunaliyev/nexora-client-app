import { ComponentType, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import Button from '../components/common/Button';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import * as packagesApi from '../lib/api/services/packages';
import type { PackageItem, BookingSlot } from '../lib/api/services/packages';

function formatPriceLabel(amount: number, unit: string): string {
  return `${amount.toLocaleString('ru-RU').replace(/,/g, ' ')} ${unit}`;
}

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
  // (Removed `useSelectedZone()` import — the slot endpoint accepts
  // a `zone_id` filter but the FE's booking flow only tracks a
  // stringified zone key (`'pc'` / `'vip'` / `'ps5'`), not the BE's
  // numeric id, so the filter goes unwired today. When zone-select
  // tracks the numeric id, plumb it back through here.)

  // Tab state was removed earlier (the Hourly tab was a dead switch
  // duplicating the package list). Kept as a single-column package
  // picker. Selected package id is the local pkg id from BE.
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Real BE data — replaces the previously hardcoded `PACKAGES` array
  // and `TIME_SLOTS` constant. Loaded once on mount; the slots payload
  // depends on the chosen package's duration so it's refreshed when
  // `selectedPackageId` changes.
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
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
        // Auto-pick the first (cheapest) package so the user always
        // has a default selection when slots load below — matches the
        // earlier UX where the hardcoded list always had a default
        // implied.
        if (list.length > 0 && selectedPackageId == null) {
          setSelectedPackageId(list[0].id);
        }
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
  // that don't fit before close.
  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? null,
    [packages, selectedPackageId],
  );

  // Fetch slots whenever the selected package changes.
  useEffect(() => {
    if (!selectedPackage) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    packagesApi
      .listBookingSlots({
        durationMin: selectedPackage.duration_min,
        // zoneId from the booking flow is a string key ('pc' / 'vip' /
        // 'ps5'). The BE filter wants a numeric zone_id which the FE
        // doesn't have at this stage — the zone-select screen tracks
        // a stringified key, not the DB id. Leaving zone_id off means
        // pricing windows aren't filtered by zone here; that's OK
        // because they're used only to flag peak hours, not to drive
        // pricing on this screen. When the zone-flow tracks the
        // numeric id end-to-end, wire it through here.
      })
      .then((res) => {
        if (cancelled) return;
        setSlots(res.slots);
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
  }, [selectedPackage?.id]);

  const currency = t.common.currencyUnit;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StepHeader step={t.timeSelect.headerStep} title={t.timeSelect.headerTitle} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t.timeSelect.title}</Text>

        {packagesLoading ? (
          <View style={styles.loaderBlock}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitle}>{t.timeSelect.noPackagesTitle}</Text>
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
        <Button
          label={t.timeSelect.continue}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selectedPackage || !selectedTime}
          onPress={() => {
            if (!selectedPackage || !selectedTime) return;
            const durationHours = Math.max(1, Math.round(selectedPackage.duration_min / 60));
            router.push({
              pathname: '/payment',
              params: {
                // Forward as strings — expo-router only supports
                // strings; the destination parses with Number(...).
                packageId: String(selectedPackage.id),
                packageTitle: selectedPackage.name,
                priceAmount: String(selectedPackage.price),
                durationHours: String(durationHours),
                startTime: selectedTime,
              },
            });
          }}
        />
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
