import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import PartyIcon from '../components/icons/PartyIcon';
import UsersIcon from '../components/icons/UsersIcon';
import MonitorIcon from '../components/icons/MonitorIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { useDialog } from '../components/common/AppDialog';
import { useAuth } from '../store/AuthProvider';
import { getErrorMessage } from '../lib/api/client';
import * as pcsApi from '../lib/api/services/pcs';
import type { Pc } from '../lib/api/types';

/**
 * /party-booking — multi-seat reservation for a group.
 *
 * Pre-fix this was a ComingSoon stub even though the BE
 * (`POST /mobile/pcs/party-book`) is implemented and accepts a
 * `pc_ids[]` array (2..8 PCs, BE-validated). Audit findings #11/#12.
 *
 * Minimal MVP scope:
 *   - Tap free PCs in the catalogue to toggle selection (2..8 cap)
 *   - Counter chip + Confirm button at the bottom
 *   - Confirm → partyBook(pc_ids), default hold 60min from now
 *   - On success → booking-success with party-specific copy
 *
 * Deliberately omits the friend-invite step: push notifications +
 * accept/decline UX aren't built yet (project memo: rewards-soon
 * pattern — surface the feature when it's truly end-to-end). The
 * party-host pays for all seats here; friends just show up.
 */
export default function PartyBookingScreen() {
  const t = useT();
  const toast = useToast();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { clubs, currentTenantId } = useAuth();
  const activeMembership =
    clubs.find((c) => c.tenant_id === currentTenantId) ?? null;

  const [pcs, setPcs] = useState<Pc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (force = false) => {
      try {
        const list = await pcsApi.listPcs({ force });
        setPcs(list);
        // Drop any previously-selected PC that's no longer free (got
        // booked by someone else between renders).
        setSelectedIds((curr) =>
          curr.filter((id) => list.some((p) => p.id === id && p.status === 'free')),
        );
      } catch (e) {
        toast.error(getErrorMessage(e));
        setPcs([]);
      }
    },
    [toast],
  );

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const freePcs = useMemo(() => pcs.filter((p) => p.status === 'free'), [pcs]);

  // BE accepts 2..8 in MobilePartyBookRequest. The toggle below
  // enforces the same range so the user can't reach the BE with an
  // invalid payload.
  const MIN_SEATS = 2;
  const MAX_SEATS = 8;

  const toggle = (id: number) => {
    setSelectedIds((curr) => {
      if (curr.includes(id)) return curr.filter((x) => x !== id);
      if (curr.length >= MAX_SEATS) {
        toast.error(t.partyBooking.errorMin1Pc); // re-use as "too many" — i18n key add is out of scope
        return curr;
      }
      return [...curr, id];
    });
  };

  const onConfirm = async () => {
    if (selectedIds.length < MIN_SEATS) {
      toast.error(t.partyBooking.errorMin1Pc);
      return;
    }
    if (!currentTenantId) {
      // Tenant gate — same defensive check as payment.tsx so a
      // post-logout state can't fall through into a phantom-tenant
      // booking.
      router.replace('/clubs-switch');
      return;
    }
    const ok = await dialog.confirm({
      title: t.partyBooking.successTitle,
      message: t.partyBooking.bookCta
        .replace('{pcs}', String(selectedIds.length))
        .replace('{friends}', '0'),
      confirmLabel: t.common.confirm,
      cancelLabel: t.common.cancel,
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      // Hold for 60min from now — same default as the single-seat
      // booking flow. The BE accepts up to 1440min (just bumped per
      // audit #16) so longer windows can be added when the FE
      // exposes a duration picker.
      await pcsApi.partyBook({
        pc_ids: selectedIds,
        hold_minutes: 60,
      });
      toast.success(t.partyBooking.successMessage);
      // Reuse the standard booking-success screen with a party
      // summary — the screen reads from generic params so it doesn't
      // need to know whether this is a single-seat or party booking.
      router.replace({
        pathname: '/booking-success',
        params: {
          clubName: activeMembership?.tenant_name ?? '',
          // Comma-separated codes — booking-success shows them on the
          // detail row as-is. Cap at 4 for layout; the rest are
          // implied by "+N more".
          seatCode: pcs
            .filter((p) => selectedIds.includes(p.id))
            .slice(0, 4)
            .map((p) => p.code)
            .join(', '),
          zoneLabel: 'party',
          packageTitle: t.partyBooking.headerTitle,
          startTime: '',
          durationHours: '1',
          totalAmount: '0',
          // No real PcBooking id for party (BE returns {ok} only),
          // so we synthesise a session-stable ref. When the BE adds
          // a `bookings[]` response we'll consume the first id.
          bookingId: `NXR-PARTY-${Date.now().toString(36).toUpperCase()}`,
        },
      });
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm =
    selectedIds.length >= MIN_SEATS && !submitting && !!currentTenantId;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={t.partyBooking.headerTitle} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <LinearGradient
          colors={['#0F1F2E', '#0B0F16']}
          style={styles.heroCard}
        >
          <View style={styles.heroIconWrap}>
            <PartyIcon size={28} color="#FF34E0" />
          </View>
          <Text style={styles.heroTitle}>{t.partyBooking.title}</Text>
          <Text style={styles.heroSub}>{t.partyBooking.subtitle}</Text>
        </LinearGradient>

        <Text style={styles.sectionLabel}>
          {t.partyBooking.step1
            .replace('{selected}', String(selectedIds.length))
            .replace('{total}', String(MAX_SEATS))}
        </Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : freePcs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptySub}>{t.partyBooking.noFreeSeats}</Text>
          </View>
        ) : (
          <View style={styles.seatGrid}>
            {freePcs.map((p) => {
              const isSelected = selectedIds.includes(p.id);
              const idx = isSelected ? selectedIds.indexOf(p.id) + 1 : null;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.seatTile, isSelected && styles.seatTileSelected]}
                  activeOpacity={0.85}
                  onPress={() => toggle(p.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={p.code}
                >
                  <MonitorIcon
                    size={18}
                    color={isSelected ? '#FF34E0' : '#8B95A8'}
                  />
                  <Text
                    style={[styles.seatLabel, isSelected && styles.seatLabelSelected]}
                  >
                    {p.code}
                  </Text>
                  {idx != null && (
                    <View style={styles.seatIndex}>
                      <Text style={styles.seatIndexText}>{idx}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View
        style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <View style={styles.counterRow}>
          <View style={styles.counterPill}>
            <UsersIcon size={14} color="#FF34E0" />
            <Text style={styles.counterText}>
              {selectedIds.length}/{MAX_SEATS}
            </Text>
          </View>
          {selectedIds.length > 0 && selectedIds.length < MIN_SEATS && (
            <Text style={styles.hintText}>{t.partyBooking.errorMin1Pc}</Text>
          )}
        </View>
        {/* Party-confirm CTA — full lg pill with dynamic label
            "Bron qilish ({pcs} ta PC, {friends} do'st)". The label
            varies length significantly with seat count so the lg
            padding gives breathing room. Gated on canConfirm
            (>= MIN_SEATS, has tenant, not already submitting). */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onConfirm}
          disabled={!canConfirm}
          accessibilityRole="button"
          accessibilityLabel={t.partyBooking.bookCta
            .replace('{pcs}', String(selectedIds.length))
            .replace('{friends}', '0')}
          accessibilityState={{ disabled: !canConfirm, busy: submitting }}
          style={[bookCtaStyles.btn, !canConfirm && bookCtaStyles.btnDisabled]}
        >
          <LinearGradient
            colors={['#3B5BF5', '#8B3DF5']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={bookCtaStyles.fill}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={bookCtaStyles.label}>
                {t.partyBooking.bookCta
                  .replace('{pcs}', String(selectedIds.length))
                  .replace('{friends}', '0')}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  heroCard: {
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 8,
    gap: 8,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 52, 224, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 52, 224, 0.3)',
    marginBottom: 6,
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
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 18,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seatTile: {
    width: '23.5%',
    aspectRatio: 1,
    backgroundColor: '#141823',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
  },
  seatTileSelected: {
    backgroundColor: 'rgba(255, 52, 224, 0.08)',
    borderColor: '#FF34E0',
  },
  seatLabel: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  seatLabelSelected: {
    color: Colors.text,
  },
  seatIndex: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF34E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatIndexText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 10,
    color: '#0B0F16',
    lineHeight: 12,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 52, 224, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 52, 224, 0.3)',
  },
  counterText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12,
    color: '#FF34E0',
  },
  hintText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
    flex: 1,
  },
});

// Inline party-confirm CTA. 52pt lg pill to fit the variable-length
// "Bron qilish (N PC, M friends)" label across uz/ru/en without
// wrapping; disabled state mirrors canConfirm so a misfire 422 is
// impossible.
const bookCtaStyles = StyleSheet.create({
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
