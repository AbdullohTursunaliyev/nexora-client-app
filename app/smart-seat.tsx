import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import BrainIcon from '../components/icons/BrainIcon';
import SparklesIcon from '../components/icons/SparklesIcon';
import MonitorIcon from '../components/icons/MonitorIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import * as pcsApi from '../lib/api/services/pcs';
import { useSelectedSeat } from '../lib/state/useSelectedSeat';
import { useSelectedZone } from '../lib/state/useSelectedZone';
import type { Pc } from '../lib/api/types';

/**
 * /smart-seat — AI-recommended PC pick.
 *
 * Pre-fix this was a ComingSoon stub even though the BE endpoint
 * (`/mobile/pcs/smart-seat`) is fully implemented and returns a
 * ranked list of candidates. Audit findings #11/#12 flagged the
 * stub-with-working-BE asymmetry. This screen now:
 *
 *   1. Calls smartSeat() on mount
 *   2. Renders the top pick as a hero card with the PC code + zone
 *   3. Lets the user "Hold" it (smartSeatHold → PcBooking) and
 *      continue to /time-select for package + slot selection
 *   4. Surfaces up to 3 alternatives as quick-pick chips below
 *
 * No payment / time UI here — the screen's job is just "find me a
 * seat", then the standard booking flow takes over. Holding before
 * time-select gives the user breathing room: the BE places a short
 * reservation so somebody else can't steal the seat while they pick
 * a package.
 */
export default function SmartSeatScreen() {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { select: selectSeat } = useSelectedSeat('pc');
  const { select: selectZone, setBeZoneId } = useSelectedZone();

  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<Pc | null>(null);
  const [alternatives, setAlternatives] = useState<Pc[]>([]);
  const [holding, setHolding] = useState(false);
  const [holdingPcId, setHoldingPcId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Default arrive_in = 0 (right now), limit = 4 so we have 1 pick
      // + up to 3 alternatives. The BE-side ML ranker decides which
      // PC tops the list — we just present it.
      const res = await pcsApi.smartSeat({ limit: 4 });
      setPick(res.pc);
      setAlternatives(res.alternatives.slice(0, 3));
    } catch (e) {
      toast.error(getErrorMessage(e));
      setPick(null);
      setAlternatives([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Map BE zone_name → FE category bucket (mirrors zone-select's
  // groupZones heuristic). Used so the downstream seat-select / payment
  // screens render the right zone label even though the user never
  // visited zone-select on this fast-path. Falls through to 'pc' so
  // the seat-select default kicks in for unrecognised zones.
  const zoneKeyFor = (zoneName?: string): 'pc' | 'vip' | 'ps5' => {
    const lower = (zoneName ?? '').toLowerCase();
    if (/vip/.test(lower)) return 'vip';
    if (/ps|playstation|console|консол/.test(lower)) return 'ps5';
    return 'pc';
  };

  const hold = useCallback(
    async (target: Pc) => {
      if (holding) return;
      setHolding(true);
      setHoldingPcId(target.id);
      try {
        await pcsApi.smartSeatHold(target.id);
        // Hand off into the standard booking flow. We pre-set the
        // shared selection singletons so time-select + payment see
        // the picked seat the same way they would after the full
        // zone → seat path.
        const bucket = zoneKeyFor(target.zone_name);
        await selectZone(bucket);
        // BE zone id not known here — seat-select normally writes
        // it after grid resolution. Leave it null; time-select
        // falls back to tenant-default slot windows.
        setBeZoneId(null);
        selectSeat(target.code, target.id);
        toast.success(t.smartSeat.successHeld);
        router.push('/time-select');
      } catch (e) {
        toast.error(getErrorMessage(e));
      } finally {
        setHolding(false);
        setHoldingPcId(null);
      }
    },
    [holding, selectZone, selectSeat, setBeZoneId, toast, t],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SimpleHeader title={t.smartSeat.headerTitle} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* AI hero card — same gradient idiom as the help-support
            hero, but with a brain icon to signal "this is a
            recommendation, not a catalogue". */}
        <LinearGradient
          colors={['#0F1F2E', '#0B0F16']}
          style={styles.heroCard}
        >
          <LinearGradient
            colors={['rgba(0, 207, 255, 0.18)', 'rgba(124, 58, 237, 0.12)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.aiAvatarWrap}>
            <View style={styles.aiAvatarBg}>
              <BrainIcon size={36} color="#00CFFF" />
            </View>
          </View>
          <View style={styles.aiTagRow}>
            <SparklesIcon size={12} color="#00CFFF" />
            <Text style={styles.aiTag}>{t.smartSeat.aiTag}</Text>
          </View>
          <Text style={styles.heroTitle}>{t.smartSeat.title}</Text>
          <Text style={styles.heroSub}>{t.smartSeat.subtitle}</Text>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : !pick ? (
          // Empty state — BE had no eligible PC right now. Common
          // case: tenant is fully booked, or the recommender's
          // arrive_in filter didn't match any free seat. Honest copy
          // beats a fake recommendation.
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t.seatSelect.allTakenTitle}</Text>
            <Text style={styles.emptySub}>{t.seatSelect.allTakenSub}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>{t.smartSeat.pcLabel}</Text>
            <View style={styles.pickCard}>
              <View style={styles.pickIconWrap}>
                <MonitorIcon size={22} color="#00CFFF" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.pickCode}>{pick.code}</Text>
                <Text style={styles.pickZone}>
                  {pick.zone_name || t.zoneSelect.pcZone}
                </Text>
                <View style={styles.statusPill}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>{t.smartSeat.statusFree}</Text>
                </View>
              </View>
            </View>

            {alternatives.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{t.zoneSelect.recommended}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.altRow}
                >
                  {alternatives.map((alt) => (
                    <TouchableOpacity
                      key={alt.id}
                      style={styles.altChip}
                      activeOpacity={0.85}
                      onPress={() => hold(alt)}
                      disabled={holding}
                      accessibilityRole="button"
                      accessibilityLabel={alt.code}
                    >
                      {holding && holdingPcId === alt.id ? (
                        <ActivityIndicator size="small" color="#00CFFF" />
                      ) : (
                        <>
                          <MonitorIcon size={14} color="#00CFFF" />
                          <Text style={styles.altChipText}>{alt.code}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}
      </ScrollView>

      {pick && (
        <View
          style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          {/* Hold-pick CTA — full lg pill. Loading state is per-pc
              (only spins when THIS pc is the one being held) so the
              alternative chips above can show their own per-chip
              spinners without all three spinning at once. */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => hold(pick)}
            disabled={holding}
            accessibilityRole="button"
            accessibilityLabel={t.smartSeat.holdBtn}
            accessibilityState={{
              disabled: holding,
              busy: holding && holdingPcId === pick.id,
            }}
            style={[holdBtnStyles.btn, holding && holdBtnStyles.btnDisabled]}
          >
            <LinearGradient
              colors={['#3B5BF5', '#8B3DF5']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={holdBtnStyles.fill}
            >
              {holding && holdingPcId === pick.id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={holdBtnStyles.label}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {t.smartSeat.holdBtn}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    marginTop: 8,
  },
  aiAvatarWrap: {
    marginBottom: 12,
  },
  aiAvatarBg: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 207, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.32)',
  },
  aiTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 207, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.32)',
    marginBottom: 10,
  },
  aiTag: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11,
    color: '#00CFFF',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  heroSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14.5,
    color: Colors.text,
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionLabel: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12,
    color: '#8B95A8',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 10,
  },
  pickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.25)',
  },
  pickIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 207, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickCode: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 20,
    color: Colors.text,
    letterSpacing: 1,
  },
  pickZone: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#8B95A8',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11,
    color: '#22C55E',
  },
  altRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  altChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#141823',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.22)',
    minWidth: 80,
    justifyContent: 'center',
  },
  altChipText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
});

// Inline hold-CTA styles — 52pt lg pill anchored to the bottom bar.
const holdBtnStyles = StyleSheet.create({
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
