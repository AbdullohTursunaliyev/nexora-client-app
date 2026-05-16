import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SeatHeader from '../components/seat/SeatHeader';
import SeatLegend from '../components/seat/SeatLegend';
import SeatRow from '../components/seat/SeatRow';
import SeatBottomBar from '../components/seat/SeatBottomBar';
import { SeatStatus } from '../components/seat/Seat';
import FadeInView from '../components/common/FadeInView';
import BookingBreadcrumb from '../components/common/BookingBreadcrumb';
import { useT } from '../lib/i18n/LocaleProvider';
import { getErrorMessage } from '../lib/api/client';
import { useToast } from '../components/common/Toast';
import { useSelectedZone } from '../lib/state/useSelectedZone';
import { useSelectedSeat } from '../lib/state/useSelectedSeat';
import * as pcsApi from '../lib/api/services/pcs';
import type { PcGridZone } from '../lib/api/services/pcs';

const formatPrice = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ');

/**
 * Resolve the stored zone key against the BE's grid zones.
 *
 * Primary path: zone-select now stores the BE numeric zone id as a
 * string (after the refactor that dropped the FE-only pc/vip/ps5
 * buckets in favour of operator-defined zones). Direct id match is
 * unambiguous and works for any zone name.
 *
 * Legacy fallback: a user who picked a zone before that refactor will
 * have 'pc' / 'vip' / 'ps5' persisted in AsyncStorage. We honour those
 * one more time via the original free-text heuristic so returning
 * users don't dead-end on their first launch after upgrading. The
 * fallback can be removed once telemetry confirms the legacy values
 * are out of circulation.
 *
 * When neither path matches we return null (NOT `zones[0]`). Pre-fix
 * the fallback silently landed users on a different zone's layout —
 * a user who picked "PC zone" would end up booking a VIP seat without
 * realising it. Returning null surfaces the mismatch via the screen's
 * empty state rather than silently swapping the user's intent.
 *
 * `zones[0]` is still the default when zoneKey is null entirely (deep
 * link / direct navigation) since picking anything is better than
 * crashing the screen.
 */
function resolveZone(zoneKey: string | null, zones: PcGridZone[]): PcGridZone | null {
  if (zones.length === 0) return null;
  if (!zoneKey) return zones[0];

  const numId = Number(zoneKey);
  // Accept zone id === 0 too — the BE's synthesis fallback emits
  // a synthetic zone with id=0 for tenants whose PCs use the
  // legacy `pc.zone` string column instead of the `zone_id` FK.
  // Pre-fix the `numId > 0` guard sent that path through the
  // free-text heuristic below, which usually missed and the user
  // saw "no layout configured" even though there were PCs.
  if (Number.isFinite(numId)) {
    const byId = zones.find((z) => z.zone.id === numId);
    if (byId) return byId;
  }

  const want = zoneKey.toLowerCase();
  const match = zones.find((z) => {
    const name = z.zone.name.toLowerCase();
    if (want === 'vip') return name.includes('vip') || name.includes('люкс');
    if (want === 'ps5') return name.includes('ps') || name.includes('пс') || name.includes('playstation');
    // 'pc' is the default catch-all — match "pc", "standart", "default",
    // or any zone whose name doesn't look like VIP/PS5.
    if (want === 'pc') {
      const isSpecial = name.includes('vip') || name.includes('ps') || name.includes('люкс') || name.includes('пс');
      return !isSpecial;
    }
    return false;
  });
  return match ?? null;
}

export default function SeatSelectScreen() {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { zoneId, zoneName, setBeZoneId } = useSelectedZone();
  const { seatId, select } = useSelectedSeat(zoneId ?? 'pc');

  // Real BE grid replaces the hardcoded 3×10 ROWS constant. Each
  // zone has its own row layout (a club with VIP corner + PS5 lounge
  // typically has different row counts per zone).
  const [zones, setZones] = useState<PcGridZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGrid = useCallback(async () => {
    try {
      const res = await pcsApi.getPcGrid();
      console.warn(
        '[GRID-DEBUG] zones returned:',
        JSON.stringify(
          (res.zones ?? []).map((z) => ({
            id: z.zone.id,
            name: z.zone.name,
            rows: z.rows.length,
            cells: z.rows.reduce((acc, r) => acc + r.cells.length, 0),
          })),
        ),
      );
      setZones(res.zones ?? []);
    } catch (e) {
      console.warn('[GRID-DEBUG] getPcGrid threw:', String(e));
      setZones([]);
      toast.error(getErrorMessage(e));
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchGrid().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchGrid]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGrid();
    setRefreshing(false);
  }, [fetchGrid]);

  // Pick the zone whose layout we're rendering. Falls back to first
  // available zone when the FE key doesn't match — see resolveZone.
  const activeZone = useMemo(() => resolveZone(zoneId, zones), [zoneId, zones]);

  // Diagnostic: log what zoneId we have vs what zones are available
  // and whether resolveZone found a match. Surfaces in Metro and
  // makes it trivial to spot id mismatches in the field.
  useEffect(() => {
    console.warn(
      '[GRID-DEBUG] zoneId=',
      JSON.stringify(zoneId),
      'available zone ids=',
      JSON.stringify(zones.map((z) => z.zone.id)),
      'resolved=',
      activeZone ? `id=${activeZone.zone.id} name=${activeZone.zone.name}` : 'null',
    );
  }, [zoneId, zones, activeZone]);

  // Once the heuristic resolves the FE-category bucket to a specific
  // BE zone row, write its numeric id back to the shared useSelectedZone
  // singleton. Downstream screens (time-select, payment) can then
  // filter slots / scope pricing windows by the real zone id instead
  // of re-running the same free-text heuristic on every screen.
  // Audit finding #10.
  useEffect(() => {
    setBeZoneId(activeZone?.zone.id ?? null);
  }, [activeZone, setBeZoneId]);

  const zoneTitle = useMemo(() => {
    // Priority order:
    //   1. BE-resolved zone (truth once the grid loads).
    //   2. Operator-set name passed through from zone-select — covers
    //      the in-flight window and the "grid empty for this zone"
    //      case so the screen never reads as the wrong zone.
    //   3. Legacy FE-category fallback for users with stale 'vip' /
    //      'ps5' / 'pc' values still persisted from before the
    //      dynamic-zones refactor.
    if (activeZone) return activeZone.zone.name;
    if (zoneName) return zoneName;
    if (zoneId === 'vip') return t.zoneSelect.vipZone;
    if (zoneId === 'ps5') return t.zoneSelect.psZone;
    return t.zoneSelect.pcZone;
  }, [activeZone, zoneName, zoneId, t]);

  const allCells = useMemo(() => activeZone?.rows.flatMap((r) => r.cells) ?? [], [activeZone]);
  // "All taken" = every cell is non-free (booked / busy / offline).
  // Offline counts as taken too — those cells aren't bookable. Empty
  // zone (no cells) = not taken (we show the no-cells empty state).
  const allTaken = allCells.length > 0 && allCells.every((c) => c.status !== 'free');

  const handleSeatPress = (cellLabel: string, status: SeatStatus, pcId: number | null) => {
    if (status === 'taken') {
      toast.error(t.seatSelect.takenToast);
      return;
    }
    // Pass pcId alongside the label so payment.tsx can call
    // bookPc(pcId) directly instead of doing a fragile
    // listPcs().find(p => p.code === label) lookup at confirm time.
    // pcId is null only for offline placeholders (no PC installed),
    // which we've already filtered out by gating on status==='free'.
    select(seatId === cellLabel ? null : cellLabel, pcId);
  };

  const priceForZone = activeZone?.zone.price_per_hour ?? 0;
  const priceLabel = priceForZone > 0
    ? `${formatPrice(priceForZone)} ${t.common.currencyUnit}/${t.seatSelect.perHourSuffix}`
    : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SeatHeader />

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
          <BookingBreadcrumb current="seat" />
        </View>

        <Text style={styles.title}>{zoneTitle}</Text>
        <Text style={styles.subtitle}>{t.seatSelect.pickSeat}</Text>

        <SeatLegend />

        {loading ? (
          <View style={styles.loaderBlock}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : !activeZone || activeZone.rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🛋️</Text>
            <Text style={styles.emptyTitle}>{t.seatSelect.noLayoutTitle}</Text>
            <Text style={styles.emptySub}>{t.seatSelect.noLayoutSub}</Text>
          </View>
        ) : allTaken ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🚫</Text>
            <Text style={styles.emptyTitle}>{t.seatSelect.allTakenTitle}</Text>
            <Text style={styles.emptySub}>{t.seatSelect.allTakenSub}</Text>
          </View>
        ) : (
          activeZone.rows.map((row, idx) => {
            // Map each BE cell into the {id, status} shape SeatRow
            // expects. status='offline' (placeholder) is rendered as
            // 'taken' so users can't pick it.
            const seats = row.cells.map((cell) => ({
              id: cell.label,
              status: ((): SeatStatus => {
                if (cell.status === 'free') {
                  return seatId === cell.label ? 'selected' : 'available';
                }
                return 'taken';
              })(),
            }));
            return (
              <FadeInView key={row.label} delay={idx * 90}>
                <SeatRow
                  rowLabel={t.seatSelect.rowLabel.replace('{letter}', row.label)}
                  seats={seats}
                  onSeatPress={(id) => {
                    const cell = row.cells.find((c) => c.label === id);
                    if (!cell) return;
                    handleSeatPress(
                      id,
                      cell.status === 'free' ? 'available' : 'taken',
                      cell.pc_id,
                    );
                  }}
                />
              </FadeInView>
            );
          })
        )}
      </ScrollView>

      <SeatBottomBar
        selectedSeat={seatId}
        zoneLabel={zoneTitle}
        priceLabel={seatId ? priceLabel : undefined}
        bottomInset={insets.bottom}
        onContinue={() => router.push('/time-select')}
      />
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
    fontSize: 13.5,
    color: '#8B95A8',
    marginTop: 4,
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
  loaderBlock: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
