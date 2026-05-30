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

const formatPrice = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ');

/**
 * Pick the closest brand-aligned visual template for an operator-named
 * zone. The BE returns the zone name as the operator typed it — we
 * don't force a fixed taxonomy, but we DO want the card image and
 * sub-copy to match the type of seat the user is about to book.
 * Anything that doesn't look like VIP or PS lands on the generic PC
 * look, which is the right default for the vast majority of zones.
 */
function categorizeZone(name: string): 'vip' | 'ps5' | 'pc' {
  const lower = name.toLowerCase();
  if (/vip|люкс/.test(lower)) return 'vip';
  if (/ps|playstation|console|пс/.test(lower)) return 'ps5';
  return 'pc';
}

interface ZoneAggregate {
  /** Real BE zone id, stringified for `useSelectedZone` compat. */
  id: string;
  beId: number;
  title: string;
  available: number;
  /** Hourly price from BE. Null when operator hasn't configured one. */
  pricePerHour: number | null;
  category: 'vip' | 'ps5' | 'pc';
}

/**
 * Group a flat PC list into per-zone aggregates. Uses the real
 * `zone_id` / `zone_name` from each PC (now flattened from BE's
 * nested `zone: {...}` shape by the listPcs adapter) so every
 * operator-defined zone shows up regardless of name — including
 * tenants that didn't use the FE's old pc/vip/ps5 naming convention.
 *
 * PCs without a zone are filed under a synthetic "Default" zone with
 * id 0 so they aren't lost — this matches the BE catalog which
 * substitutes 'Default' for `zoneRel === null`.
 */
function groupByZone(pcs: Pc[]): ZoneAggregate[] {
  const buckets = new Map<
    number,
    { name: string; available: number; price: number }
  >();
  for (const p of pcs) {
    const id = typeof p.zone_id === 'number' ? p.zone_id : 0;
    const name = (p.zone_name || '').trim() || 'Default';
    const slot = buckets.get(id) ?? { name, available: 0, price: 0 };
    if (p.status === 'free') slot.available += 1;
    // Price per zone: take the first non-zero price we see. The BE
    // returns the same price for every PC in a zone (per the
    // `pc.zoneRel.price_per_hour` join), so we only need one sample.
    if (slot.price === 0 && p.price_per_hour && p.price_per_hour > 0) {
      slot.price = Number(p.price_per_hour);
    }
    buckets.set(id, slot);
  }
  const out: ZoneAggregate[] = [];
  for (const [id, slot] of buckets) {
    out.push({
      id: String(id),
      beId: id,
      title: slot.name,
      available: slot.available,
      pricePerHour: slot.price > 0 ? slot.price : null,
      category: categorizeZone(slot.name),
    });
  }
  return out;
}

/**
 * Zone / poisk step of the booking flow.
 *
 * Pre-fix this rendered three hardcoded buckets ('pc' / 'vip' / 'ps5')
 * and grouped PCs into them via a regex on `zone_name`. Two
 * compounding bugs broke this for almost every tenant:
 *
 *   1. The `listPcs` adapter cast the BE wire shape directly without
 *      flattening — `zone_name` and `price_per_hour` were nested
 *      under `zone: {...}` server-side but advertised as flat on the
 *      `Pc` type, so every PC's zone metadata read as undefined at
 *      runtime and ALL PCs collapsed into the 'pc' default bucket.
 *   2. The three hardcoded buckets forced operators to use specific
 *      zone names. A tenant with zones named "STANDART" / "BUS" /
 *      "DINO" (real example from a customer report) would see
 *      everything under "PC" because none of those match
 *      vip / ps / playstation / console.
 *
 * Now the adapter populates the flat zone fields (services/pcs.ts)
 * and this screen renders one card per *real* `zone_id` — name comes
 * from the operator's input, image / sub-copy come from the closest
 * brand template. Downstream screens get the numeric zone id via
 * `setBeZoneId` so seat-select doesn't have to re-derive it.
 */
export default function ZoneSelectScreen() {
  const t = useT();
  const toast = useToast();
  const { zoneId, select, setBeZoneId } = useSelectedZone();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aggregates, setAggregates] = useState<ZoneAggregate[] | null>(null);

  const loadZones = useCallback(
    async (force = false) => {
      try {
        const list = await pcsApi.listPcs({ force });
        setAggregates(groupByZone(list));
      } catch (e) {
        // Backend unreachable — surface an empty list (renders the
        // "no zones configured" empty card) plus a toast so the user
        // can distinguish "club hasn't set it up" from "we can't
        // reach the server".
        setAggregates([]);
        toast.error(getErrorMessage(e));
      }
    },
    [toast],
  );

  useEffect(() => {
    setLoading(true);
    loadZones().finally(() => setLoading(false));
  }, [loadZones]);

  // Decorate each aggregate with its display strings + image. Done
  // here (not in groupByZone) so the i18n hook reactivity stays
  // intact when the user switches language mid-screen.
  const zoneCards = useMemo(
    () =>
      (aggregates ?? []).map((zone) => {
        const description =
          zone.category === 'vip'
            ? t.zoneSelect.vipZoneDesc
            : zone.category === 'ps5'
            ? t.zoneSelect.psZoneDesc
            : t.zoneSelect.pcZoneDesc;
        const unit =
          zone.category === 'ps5'
            ? t.zoneSelect.roomUnit
            : t.zoneSelect.seatUnit;
        return {
          ...zone,
          description,
          unit,
          imageUri: Images.zones[zone.category],
        };
      }),
    [aggregates, t],
  );

  // Sort by availability — highest first. Stable sort preserves
  // insertion order for equal counts (Map iteration honours BE order).
  const sorted = useMemo(
    () => [...zoneCards].sort((a, b) => b.available - a.available),
    [zoneCards],
  );

  const onZonePress = useCallback(
    (id: string, beId: number, name: string, pricePerHour: number | null) => {
      // Pass the operator-set name + price through alongside the id
      // so the downstream seat-select / time-select / payment screens
      // can render the real club's data — pre-fix payment fell back
      // to a hardcoded FE-constant `ZONE_PRICE` table that had no
      // relation to the operator's `zones.price_per_hour` row and
      // surfaced 20 000 sum on a 12 000-sum-per-hour zone.
      select(id, name, pricePerHour);
      setBeZoneId(beId);
      router.push('/seat-select');
    },
    [select, setBeZoneId],
  );

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
                  onPress={() =>
                    onZonePress(zone.id, zone.beId, zone.title, zone.pricePerHour)
                  }
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
