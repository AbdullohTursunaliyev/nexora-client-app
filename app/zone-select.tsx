import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { Images } from '../constants/Images';
import ZoneSelectHeader from '../components/zone/ZoneSelectHeader';
import ZoneCard from '../components/zone/ZoneCard';
import SkeletonZoneCard from '../components/zone/SkeletonZoneCard';
import RealtimeBadge from '../components/zone/RealtimeBadge';
import FadeInView from '../components/common/FadeInView';
import BookingBreadcrumb from '../components/common/BookingBreadcrumb';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import { useSelectedZone } from '../lib/state/useSelectedZone';
import * as pcsApi from '../lib/api/services/pcs';
import type { Pc } from '../lib/api/types';

interface Zone {
  id: string;
  available: number;
  /**
   * Hourly price in the tenant's currency. Null when the BE has no
   * per-zone price configured for this tenant — the UI then renders
   * "Set at club" instead of inventing a fallback number. Audit
   * finding #9.
   */
  pricePerHour: number | null;
  imageUri: string;
  isRoom: boolean;
}

const formatPrice = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ');

// Group raw PCs from the API into the 3 logical zones the UI expects.
// The backend returns flat list of PCs with optional zone_id/zone_name.
function groupZones(pcs: Pc[]): Record<'pc' | 'vip' | 'ps5', { available: number; price: number }> {
  const byKey: Record<string, { available: number; price: number }> = {
    pc: { available: 0, price: 0 },
    vip: { available: 0, price: 0 },
    ps5: { available: 0, price: 0 },
  };
  for (const p of pcs) {
    const name = (p.zone_name ?? '').toLowerCase();
    let key: 'pc' | 'vip' | 'ps5' = 'pc';
    if (/vip/.test(name)) key = 'vip';
    else if (/ps|playstation|console/.test(name)) key = 'ps5';
    if (p.status === 'free') byKey[key].available += 1;
    if (p.price_per_hour && byKey[key].price === 0) {
      byKey[key].price = Number(p.price_per_hour);
    }
  }
  return byKey;
}

export default function ZoneSelectScreen() {
  const t = useT();
  const toast = useToast();
  const { zoneId, select } = useSelectedZone();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [grouped, setGrouped] = useState<ReturnType<typeof groupZones> | null>(null);

  const loadZones = useCallback(
    async (force = false) => {
      try {
        // `force: true` bypasses the 30s pcs cache on pull-to-refresh,
        // otherwise we share a cached result across the booking flow.
        const list = await pcsApi.listPcs({ force });
        setGrouped(groupZones(list));
      } catch (e) {
        // Backend unavailable — render zones with `available: 0` so the
        // user sees the empty-state cards instead of fake "48 PCs free"
        // capacity. The shape stays non-null so the loading skeleton
        // doesn't reappear; the cards just sit at zero until the next
        // pull-to-refresh succeeds.
        //
        // ALSO surface a toast so the user knows the zeros mean
        // "couldn't reach the server" vs "every zone is genuinely
        // full". Pre-fix the silent catch left the user staring at
        // 0/0/0 with no way to distinguish those cases.
        setGrouped({
          pc: { available: 0, price: 0 },
          vip: { available: 0, price: 0 },
          ps5: { available: 0, price: 0 },
        });
        toast.error(getErrorMessage(e));
      }
    },
    [toast],
  );

  useEffect(() => {
    setLoading(true);
    loadZones().finally(() => setLoading(false));
  }, [loadZones]);

  // Availability + price come ONLY from the live `groupZones()` result.
  // Pre-fix the `?? 48` / `?? 12` / `?? 8` fallbacks invented fake
  // capacity numbers whenever `listPcs()` failed or returned an empty
  // list, so a tenant with zero PCs would still show "48 free PCs"
  // and book the user onto a non-existent seat.
  //
  // Price: pre-fix this fell back to 20k/35k/25k zone catalogue prices
  // when the BE returned 0 — but "the BE doesn't have a per-zone price
  // configured for this tenant" is operationally distinct from "we know
  // the price is 20 000 so'm". Inventing a number meant the user saw a
  // price the operator had never set, and could be surprised at the
  // till. `pricePerHour: null` now indicates "no price configured" so
  // the UI can render "Set at club" instead. Audit finding #9.
  const zones: (Zone & {
    title: string;
    description: string;
    unit: string;
    pricePerHour: number | null;
  })[] = useMemo(
    () => [
      {
        id: 'pc',
        title: t.zoneSelect.pcZone,
        description: t.zoneSelect.pcZoneDesc,
        available: grouped?.pc.available ?? 0,
        pricePerHour: grouped && grouped.pc.price > 0 ? grouped.pc.price : null,
        imageUri: Images.zones.pc,
        isRoom: false,
        unit: t.zoneSelect.seatUnit,
      },
      {
        id: 'vip',
        title: t.zoneSelect.vipZone,
        description: t.zoneSelect.vipZoneDesc,
        available: grouped?.vip.available ?? 0,
        pricePerHour: grouped && grouped.vip.price > 0 ? grouped.vip.price : null,
        imageUri: Images.zones.vip,
        isRoom: false,
        unit: t.zoneSelect.seatUnit,
      },
      {
        id: 'ps5',
        title: t.zoneSelect.psZone,
        description: t.zoneSelect.psZoneDesc,
        available: grouped?.ps5.available ?? 0,
        pricePerHour: grouped && grouped.ps5.price > 0 ? grouped.ps5.price : null,
        imageUri: Images.zones.ps5,
        isRoom: true,
        unit: t.zoneSelect.roomUnit,
      },
    ],
    [t, grouped],
  );

  // Sort by availability (highest first), but keep stable order for equal counts
  const sorted = useMemo(
    () => [...zones].sort((a, b) => b.available - a.available),
    [zones],
  );

  const onZonePress = (id: string) => {
    select(id);
    router.push('/seat-select');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    await loadZones(true);
    setRefreshing(false);
  }, [loadZones]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ZoneSelectHeader />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00CFFF"
            colors={['#00CFFF']}
            progressBackgroundColor="#141823"
          />
        }
      >
        <View style={styles.crumbWrap}>
          <BookingBreadcrumb current="zone" />
        </View>

        <Text style={styles.title}>{t.zoneSelect.title}</Text>
        <Text style={styles.subtitle}>{t.zoneSelect.subtitle}</Text>

        {loading || refreshing ? (
          <>
            {[0, 1, 2].map((i) => (
              <SkeletonZoneCard key={i} />
            ))}
          </>
        ) : sorted.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🚪</Text>
            <Text style={styles.emptyTitle}>{t.zoneSelect.emptyTitle}</Text>
            <Text style={styles.emptySub}>{t.zoneSelect.emptySub}</Text>
          </View>
        ) : (
          sorted.map((zone, idx) => {
            const availLabel = t.zoneSelect.available
              .replace('{n}', String(zone.available))
              .replace('{unit}', zone.unit);
            // When the BE has no per-zone price configured for this
            // tenant we show "Set at club" instead of inventing a
            // number. The user pays at the till in that case.
            const priceLabel =
              zone.pricePerHour == null
                ? t.zoneSelect.priceAtClub
                : t.zoneSelect.pricePerHour.replace(
                    '{price}',
                    `${formatPrice(zone.pricePerHour)} ${t.common.currencyUnit}`,
                  );
            return (
              <FadeInView key={zone.id} delay={idx * 80}>
                <ZoneCard
                  title={zone.title}
                  description={zone.description}
                  available={zone.available}
                  availableLabel={availLabel}
                  fullLabel={t.zoneSelect.full}
                  priceLabel={priceLabel}
                  imageUri={zone.imageUri}
                  selected={zone.id === zoneId}
                  onPress={() => onZonePress(zone.id)}
                />
              </FadeInView>
            );
          })
        )}

        <RealtimeBadge />
      </ScrollView>
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
    paddingBottom: 24,
  },
  crumbWrap: {
    marginTop: 4,
    marginBottom: 14,
  },
  title: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.text,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#8B95A8',
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
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
