import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import HomeHeader from '../../components/home/HomeHeader';
import Button from '../../components/common/Button';
import WalletIcon from '../../components/icons/WalletIcon';
import ChevronDownIcon from '../../components/icons/ChevronDownIcon';
import CheckIcon from '../../components/icons/CheckIcon';
import LocationPinIcon from '../../components/icons/LocationPinIcon';
import { useDiscoverClubs } from '../../lib/hooks/useDiscoverClubs';
import { useSelectedClub } from '../../lib/state/useSelectedClub';
import { useT } from '../../lib/i18n/LocaleProvider';
import { useAuth } from '../../store/AuthProvider';

function formatSum(value: number): string {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export default function WalletScreen() {
  const t = useT();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { selectedClubId, select, ready } = useSelectedClub();
  const { clubs, refresh: refreshClubs } = useDiscoverClubs();
  // Real per-tenant balance + bonus live on the AuthProvider's
  // ClubMembership list (BE /auth/me payload), NOT on the discover
  // clubs (which only carry name + rating + cover). Pre-fix we read
  // `discoverClub.balance` which was always undefined → `0`, so every
  // wallet card showed a flat "0 so'm" no matter how much money the
  // user actually had in the club's wallet.
  const { clubs: memberships, refreshMe } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshClubs(), refreshMe()]);
    } catch {
      // Either endpoint failing keeps the existing view intact —
      // don't surface a toast for a passive refresh.
    } finally {
      setRefreshing(false);
    }
  };

  // Build a fast-lookup Set of tenant ids the user has actually joined.
  // Pre-fix the wallet relied solely on the BE-side `joined` flag from
  // /discover/clubs, which is unreliable on cold start before the
  // client_token settles (same race that bit ClubsTabs). Falling back
  // to AuthProvider's memberships list keeps the wallet usable during
  // that window: if BE says a club ISN'T joined but the membership
  // list says it IS, we trust the membership.
  const memberSet = useMemo(
    () => new Set(memberships.map((m) => String(m.tenant_id))),
    [memberships],
  );
  const joinedClubs = useMemo(
    () =>
      memberSet.size > 0
        ? clubs.filter((c) => memberSet.has(String(c.id)) || c.joined)
        : clubs.filter((c) => c.joined),
    [clubs, memberSet],
  );
  const activeClub = useMemo(
    () => joinedClubs.find((c) => c.id === selectedClubId) ?? null,
    [joinedClubs, selectedClubId],
  );
  // Match the discover club to its ClubMembership row. We compare
  // tenant_id as a string because the discover adapter stores `id` as
  // a string while AuthProvider keeps `tenant_id` as a number — strict
  // === would never match.
  const activeMembership = useMemo(() => {
    if (!activeClub) return null;
    return memberships.find((m) => String(m.tenant_id) === activeClub.id) ?? null;
  }, [activeClub, memberships]);
  const realBalance = activeMembership?.balance ?? 0;

  // Re-fetch on screen focus so the wallet balance reflects a
  // just-completed top-up when the user returns from the PSP redirect
  // (or from any other screen that may have credited the balance).
  // Without this hook the wallet keeps showing the pre-topup amount
  // until the user manually pulls to refresh.
  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe]),
  );

  // Auto-select the first joined club when nothing is persisted yet.
  // Fresh-account flow: user joins their first club, opens /wallet,
  // and would otherwise see the "Klub tanlanmagan" empty state asking
  // them to pick — even though there's only one club they could pick.
  // Auto-selecting on first mount eliminates that extra tap. Once a
  // user explicitly picks (via the switcher or the empty-state CTA)
  // the AsyncStorage-backed `selectedClubId` overrides this default
  // forever, so the auto-pick never overwrites a real choice.
  useEffect(() => {
    if (!ready) return;
    if (selectedClubId) return;
    if (joinedClubs.length === 0) return;
    void select(joinedClubs[0].id);
  }, [ready, selectedClubId, joinedClubs, select]);

  const onPick = (id: string) => {
    select(id);
    setPickerOpen(false);
  };

  const renderPicker = () => (
    <Modal
      visible={pickerOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setPickerOpen(false)}
    >
      <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t.walletScreen.pickerTitle}</Text>
          <Text style={styles.sheetSub}>{t.walletScreen.pickerSub}</Text>

          {joinedClubs.length === 0 ? (
            <View style={styles.sheetEmpty}>
              <Text style={styles.sheetEmptyText}>{t.walletScreen.noClubs}</Text>
              <Button
                label={t.walletScreen.joinClubBtn}
                variant="primary"
                size="md"
                onPress={() => {
                  setPickerOpen(false);
                  router.push('/club-join');
                }}
              />
            </View>
          ) : (
            <View style={styles.clubsList}>
              {joinedClubs.map((club) => {
                const isActive = club.id === selectedClubId;
                // Look up the per-tenant balance from the membership
                // list (the source of truth) rather than `club.balance`
                // which the discover adapter never fills (audit HIGH).
                // Pre-fix every row showed "0 so'm" regardless of the
                // user's real per-club balance.
                const membership = memberships.find(
                  (m) => String(m.tenant_id) === club.id,
                );
                const clubBalance = membership?.balance ?? 0;
                return (
                  <TouchableOpacity
                    key={club.id}
                    style={[styles.clubRow, isActive && styles.clubRowActive]}
                    activeOpacity={0.7}
                    onPress={() => onPick(club.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={club.name}
                  >
                    <View style={styles.clubRowIcon}>
                      <LocationPinIcon size={18} color="#00CFFF" />
                    </View>
                    <View style={styles.clubRowInfo}>
                      <Text style={styles.clubRowName} numberOfLines={1}>
                        {club.name}
                      </Text>
                      <Text style={styles.clubRowMeta}>
                        {t.walletScreen.balanceShort}: {formatSum(clubBalance)}{' '}
                        {t.common.currencyUnit}
                      </Text>
                    </View>
                    {isActive && (
                      <View style={styles.checkBg}>
                        <CheckIcon size={12} color={Colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (!ready) {
    return <SafeAreaView style={styles.safe} edges={['top']} />;
  }

  if (!activeClub) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00CFFF"
            />
          }
        >
          <HomeHeader />

          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <WalletIcon size={28} color="#00CFFF" />
            </View>
            <Text style={styles.emptyTitle}>{t.walletScreen.emptyTitle}</Text>
            <Text style={styles.emptyDescription}>{t.walletScreen.emptyDesc}</Text>
            <Button
              label={t.walletScreen.emptyPickBtn}
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => setPickerOpen(true)}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/club-join')}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t.walletScreen.emptyJoinLink}
            >
              <Text style={styles.emptyLink}>{t.walletScreen.emptyJoinLink}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        {renderPicker()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00CFFF"
          />
        }
      >
        <HomeHeader />

        <TouchableOpacity
          style={styles.clubSwitcher}
          activeOpacity={0.7}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t.walletScreen.clubLabel} ${activeClub.name}`}
        >
          <Text style={styles.clubSwitcherLabel}>{t.walletScreen.clubLabel}</Text>
          <Text style={styles.clubSwitcherName} numberOfLines={1}>
            {activeClub.name}
          </Text>
          <ChevronDownIcon size={14} color="#8B95A8" />
        </TouchableOpacity>

        {/* ── Balance card ─────────────────────────────────────────
            Visual reference: profile screen's "Programma loyalnosti"
            card. Same purple-gradient slab + a tinted icon box on
            the right — that pattern reads as a "medium colorful"
            primary element across the app (loyalty, achievements,
            balance) without falling into the shiny / aurora /
            shimmer territory user feedback rejected.
            Iteration history:
              v1: aurora gradient + orbs + LIVE pulse + shimmer +
                  bonus row + Soon plus-button. Too noisy.
              v2: flat dark slab + 3px cyan accent strip. Too plain.
              v3 (this): loyalty-card gradient + wallet icon box +
                  big amount. The "siblings on the home + profile"
                  feeling clicks. */}
        <LinearGradient
          colors={['#3B1F6F', '#1F1B4E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceContent}>
            <Text style={styles.balanceLabel}>
              {t.walletScreen.balanceLabel}
            </Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountValue}>{formatSum(realBalance)}</Text>
              <Text style={styles.amountUnit}>{t.common.currencyUnit}</Text>
            </View>
          </View>
          <View style={styles.balanceIconWrap}>
            <View style={styles.balanceIconBg}>
              <WalletIcon size={36} color="#A78BFA" />
            </View>
          </View>
        </LinearGradient>

        {/* Payment methods section — Click + Payme cards rendered as
            soon-gated tiles. Non-tappable: the user sees that these
            options are coming without being routed into a placeholder
            screen that confuses the "Soon" promise. Restore the
            onPress + drop the badge per card when the PSP integration
            lands. */}
        <Text style={styles.sectionTitle}>
          {t.walletScreen.paymentMethodsTitle}
        </Text>

        <PaymentMethodCard
          name="Payme"
          subtitle={t.walletScreen.paymeSub}
          letter="P"
          accent="#26C6F8"
          a11y={t.walletScreen.paymentMethodA11y.replace('{name}', 'Payme')}
          soonLabel={t.soon.badgeShort}
        />
        <PaymentMethodCard
          name="Click"
          subtitle={t.walletScreen.clickSub}
          letter="C"
          accent="#22C55E"
          a11y={t.walletScreen.paymentMethodA11y.replace('{name}', 'Click')}
          soonLabel={t.soon.badgeShort}
        />
      </ScrollView>
      {renderPicker()}
    </SafeAreaView>
  );
}

interface PaymentMethodCardProps {
  name: string;
  subtitle: string;
  letter: string;
  accent: string;
  a11y: string;
  soonLabel: string;
}

function PaymentMethodCard({
  name,
  subtitle,
  letter,
  accent,
  a11y,
  soonLabel,
}: PaymentMethodCardProps) {
  return (
    // Non-tappable View — soon-gated. Once the PSP wiring lands,
    // promote to TouchableOpacity with an onPress that initiates the
    // top-up flow + drop the Soon badge.
    <View
      style={styles.methodCard}
      accessibilityRole="summary"
      accessible
      accessibilityLabel={`${a11y}, ${soonLabel}`}
    >
      <View style={[styles.methodLogo, { backgroundColor: accent }]}>
        <Text style={styles.methodLogoText}>{letter}</Text>
      </View>
      <View style={styles.methodBody}>
        <Text style={styles.methodName}>{name}</Text>
        <Text style={styles.methodSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.soonBadge, styles.soonBadgeInline]}>
        <Text style={styles.soonBadgeText}>{soonLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  clubSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#141823',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  clubSwitcherLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
  },
  clubSwitcherName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
    maxWidth: 220,
  },

  // ── Balance card ──────────────────────────────────────────────────
  // Mirrors the profile screen's "Programma loyalnosti" card so the
  // two primary purple-gradient elements across the app feel like
  // siblings. Same gradient stops, same 16pt radius, same right-side
  // icon-box pattern; only the content (label + amount vs. title +
  // CTA) differs. Reads as "medium colorful" — branded enough to
  // stand out from the matte dark slabs around it without the
  // shimmer / orb / LIVE pulse noise the earlier iterations carried.
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
  },
  balanceContent: {
    flex: 1,
    gap: 8,
  },
  balanceLabel: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#C4B5FD',
    letterSpacing: 0.2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  amountValue: {
    fontFamily: Fonts.inter.bold,
    fontSize: 28,
    color: Colors.text,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  amountUnit: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#C4B5FD',
    marginBottom: 4,
  },
  // Icon column mirrors loyaltyIconWrap/loyaltyIconBg in profile.tsx
  // (88pt outer slot, 72pt tinted square). Lighter purple tint vs.
  // the loyalty's pink so the two cards visually distinguish at a
  // glance — same shape language, different accent.
  balanceIconWrap: {
    width: 88,
    alignItems: 'center',
  },
  balanceIconBg: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(167, 139, 250, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.25)',
  },

  // ── Section heading + payment methods ────────────────────────────
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.85,
  },
  methodLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLogoText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.white,
  },
  methodBody: {
    flex: 1,
    gap: 3,
  },
  methodName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  methodSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },

  // ── Soon badge variants ──────────────────────────────────────────
  soonBadge: {
    backgroundColor: 'rgba(255, 159, 67, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 67, 0.45)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  soonBadgeInline: {
    alignSelf: 'center',
  },
  soonBadgeText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 9,
    color: '#FFB76A',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ── Empty / no-club state ────────────────────────────────────────
  emptyCard: {
    backgroundColor: '#141823',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    marginTop: 32,
    gap: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
    textAlign: 'center',
  },
  emptyDescription: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 8,
  },
  emptyLink: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#00CFFF',
    marginTop: 6,
  },

  // ── Picker sheet ─────────────────────────────────────────────────
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#141823',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A4250',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
  },
  sheetSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    marginTop: 4,
    marginBottom: 14,
  },
  clubsList: {
    gap: 8,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F2B',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  clubRowActive: {
    borderColor: '#00CFFF',
    backgroundColor: 'rgba(0, 207, 255, 0.06)',
  },
  clubRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubRowInfo: {
    flex: 1,
    gap: 2,
  },
  clubRowName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  clubRowMeta: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  checkBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00CFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  sheetEmptyText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
  },
});
