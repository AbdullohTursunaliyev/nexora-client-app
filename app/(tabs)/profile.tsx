import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useAuth } from '../../store/AuthProvider';
import { useT } from '../../lib/i18n/LocaleProvider';
import * as clientApi from '../../lib/api/services/client';
import * as notificationsApi from '../../lib/api/services/notifications';
import {
  setUnreadCount,
  useUnreadCount,
} from '../../lib/state/notificationUnread';
import UserAvatar from '../../components/common/UserAvatar';
import TrophyIcon from '../../components/icons/TrophyIcon';
import GamepadIcon from '../../components/icons/GamepadIcon';
import WalletIcon from '../../components/icons/WalletIcon';
import GiftIcon from '../../components/icons/GiftIcon';
import CalendarIcon from '../../components/icons/CalendarIcon';
import ChevronRightIcon from '../../components/icons/ChevronRightIcon';
import RobotIcon from '../../components/icons/RobotIcon';
import SparklesIcon from '../../components/icons/SparklesIcon';
import ChartIcon from '../../components/icons/ChartIcon';
import HeartIcon from '../../components/icons/HeartIcon';
import UsersIcon from '../../components/icons/UsersIcon';
import MailIcon from '../../components/icons/MailIcon';
import HomeIcon from '../../components/icons/HomeIcon';
import PlusIcon from '../../components/icons/PlusIcon';
import StarIcon from '../../components/icons/StarIcon';
import BrainIcon from '../../components/icons/BrainIcon';
import HourglassIcon from '../../components/icons/HourglassIcon';
import PartyIcon from '../../components/icons/PartyIcon';
import QrIcon from '../../components/icons/QrIcon';
import MessageCircleIcon from '../../components/icons/MessageCircleIcon';
import SettingsIcon from '../../components/icons/SettingsIcon';
import BellIcon from '../../components/icons/BellIcon';

type IconCmp = React.ComponentType<{ size?: number; color?: string }>;

function formatSum(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export default function ProfileScreen() {
  const { user, currentTenantId, refreshMe } = useAuth();
  const t = useT();

  // Real per-tenant rank + stats. Pre-fix the profile screen hardcoded
  // "Lvl 12", "1 240 000 score", "48 games" — fixture values that
  // were the same for every account regardless of activity. Now we
  // pull from /mobile/client/summary (rank.current.name, stats.*).
  const [rankName, setRankName] = useState<string>(t.home.levelDefault);
  const [totalSpent, setTotalSpent] = useState<number | null>(null);
  const [sessionsCount, setSessionsCount] = useState<number | null>(null);
  // Subscribe to the shared unread singleton — pre-fix the profile
  // bell was a separate local fetch that didn't sync with HomeHeader.
  // After the user marked all read on /notifications, HomeHeader's
  // badge cleared but profile's still showed the stale count until
  // a manual refresh. Reading from the singleton keeps both badges
  // in lock-step.
  const unreadCount = useUnreadCount();
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!currentTenantId) {
      setRankName(t.home.levelDefault);
      setTotalSpent(null);
      setSessionsCount(null);
      return;
    }
    try {
      const summary = await clientApi.getSummary();
      const rank = summary?.rank?.current?.name;
      if (rank) setRankName(rank);
      const tHours = summary?.stats?.total_spent;
      if (typeof tHours === 'number') setTotalSpent(tHours);
      const sc = summary?.stats?.sessions_count;
      if (typeof sc === 'number') setSessionsCount(sc);
    } catch {
      // Keep cached values when /summary fails.
    }
  }, [currentTenantId, t]);

  // Fetch unread count and PUSH into the shared singleton so the home
  // tab's bell badge stays in sync. Pre-fix profile had its own local
  // state — the two screens disagreed every time one of them refreshed
  // before the other.
  const loadUnread = useCallback(async () => {
    try {
      const res = await notificationsApi.listNotifications(undefined, currentTenantId);
      const beUnread = typeof res.unread_count === 'number' ? res.unread_count : null;
      const fallback = (res.items ?? []).filter((n) => !n.read).length;
      setUnreadCount(beUnread ?? fallback);
    } catch {
      // Quiet — keep the previous singleton value rather than zeroing
      // on a transient network error.
    }
  }, [currentTenantId]);

  useEffect(() => {
    void loadSummary();
    void loadUnread();
  }, [loadSummary, loadUnread]);

  // Refetch on every screen focus — covers the user returning from
  // /notifications (unread count drops), /wallet-topup (rank may
  // tick over a threshold), or /profile-edit (display name change).
  // Cheap relative to a full pull-to-refresh and keeps the screen
  // feeling responsive.
  useFocusEffect(
    useCallback(() => {
      void loadSummary();
      void loadUnread();
      // Greeting refresh as a side-effect — the user might have been
      // on a different screen across an hour boundary (left at 17:55
      // afternoon, returned at 18:05 evening). Recomputing on focus
      // keeps the copy honest without a permanent timer.
      setGreeting(computeGreeting());
    }, [loadSummary, loadUnread]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshMe(), loadSummary(), loadUnread()]);
    } catch {
      // Quiet — keep cached state if endpoints are unreachable.
    } finally {
      setRefreshing(false);
    }
  };

  // Greeting is now stored in state + recomputed on focus so a user
  // who left the app at 17:55 ("Afternoon") and comes back at 18:05
  // ("Evening") sees the correct copy without restarting the app.
  const computeGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 6) return { text: t.home.greetingNight, emoji: '🌙' };
    if (hour < 12) return { text: t.home.greetingMorning, emoji: '☀️' };
    if (hour < 18) return { text: t.home.greetingDay, emoji: '🌤️' };
    return { text: t.home.greetingEvening, emoji: '🌆' };
  }, [t]);
  const [greeting, setGreeting] = useState(computeGreeting);
  // Keep greeting consistent with the latest `t` when locale flips —
  // without this, switching language mid-session would leave the
  // greeting string stuck in the previous locale until next focus.
  useEffect(() => {
    setGreeting(computeGreeting());
  }, [computeGreeting]);

  const displayName = (() => {
    if (!user) return t.profile.guestName;
    const fn = (user.first_name || '').trim();
    const ln = (user.last_name || '').trim();
    if (fn || ln) return `${fn}${fn && ln ? ' ' : ''}${ln}`.trim();
    return user.login;
  })();


  // Pre-fix (FE-M8) `route` was typed `any`, losing the typed-routes
  // safety expo-router gives us. Using `Href` makes typo'd routes a
  // compile error (e.g. '/sttings' won't pass).
  const QUICK_LINKS = useMemo(
    (): {
      id: string;
      label: string;
      Icon: IconCmp;
      color: string;
      route: Href;
      soon?: boolean;
    }[] => [
      // Live actions first — Book + Wallet are the two daily-use
      // entry points users tap most often, so they keep the leading
      // slots. Tournaments + Rewards are soon-gated and follow
      // behind: visible to set expectations, non-tappable until BE
      // wiring ships.
      { id: '1', label: t.profile.quickBook, Icon: CalendarIcon, color: '#00CFFF', route: '/(tabs)/bookings' },
      { id: '2', label: t.profile.quickWallet, Icon: WalletIcon, color: '#7C3AED', route: '/(tabs)/wallet' },
      { id: '3', label: t.profile.quickTournaments, Icon: TrophyIcon, color: '#F59E0B', route: '/tournaments', soon: true },
      { id: '4', label: t.profile.quickRewards, Icon: GiftIcon, color: '#FF34E0', route: '/achievements', soon: true },
    ],
    [t]
  );

  const MENU: {
    id: string;
    label: string;
    Icon: IconCmp;
    iconColor: string;
    route?: Href;
    soon?: boolean;
  }[] = [
    // `soon: true` flags entries whose destination screen is gated
    // behind `<ComingSoonView />`. The menu still navigates to the
    // route (so deep-links and back-stack work), but the user sees
    // the placeholder + "Soon" badge here makes it obvious that the
    // feature is still being built. When BE wiring lands, drop the
    // flag from the matching row and the live screen takes over.
    { id: 'ai', label: t.profile.menu.ai, Icon: RobotIcon, iconColor: '#00CFFF', route: '/ai-assistant', soon: true },
    { id: 'aiTips', label: t.profile.menu.aiTips, Icon: SparklesIcon, iconColor: '#A78BFA', route: '/smart-recommendations', soon: true },
    // Rewards center + store removed from the menu — the backend has
    // no /rewards/* routes yet (per project_rewards_soon.md). Add the
    // entries back here once the BE ships and the screens swap their
    // hardcoded fixture data for live API responses.
    { id: 'refer', label: t.profile.menu.referEarn, Icon: GiftIcon, iconColor: '#22C55E', route: '/refer-earn', soon: true },
    { id: 'stats', label: t.profile.menu.stats, Icon: ChartIcon, iconColor: '#3B82F6', route: '/statistics', soon: true },
    { id: 'favorites', label: t.profile.menu.favorites, Icon: HeartIcon, iconColor: '#EF4444', route: '/favorites' },
    { id: 'teams', label: t.profile.menu.teams, Icon: UsersIcon, iconColor: '#8B5CF6', route: '/team-finder' },
    { id: 'friends', label: t.profile.menu.friends, Icon: UsersIcon, iconColor: '#00CFFF', route: '/friends-list' },
    { id: 'friendRequests', label: t.profile.menu.friendRequests, Icon: MailIcon, iconColor: '#F59E0B', route: '/friend-requests' },
    { id: 'sessionInvites', label: t.profile.menu.sessionInvites, Icon: GamepadIcon, iconColor: '#FF34E0', route: '/session-invites', soon: true },
    { id: 'myClubs', label: t.profile.menu.myClubs, Icon: HomeIcon, iconColor: '#22C55E', route: '/clubs-switch' },
    { id: 'joinClub', label: t.profile.menu.joinClub, Icon: PlusIcon, iconColor: '#00CFFF', route: '/club-join' },
    { id: 'reviews', label: t.profile.menu.reviews, Icon: StarIcon, iconColor: '#F59E0B', route: '/club-reviews-list' },
    { id: 'smartSeat', label: t.profile.menu.smartSeat, Icon: BrainIcon, iconColor: '#A78BFA', route: '/smart-seat', soon: true },
    { id: 'smartQueue', label: t.profile.menu.smartQueue, Icon: HourglassIcon, iconColor: '#0EA5E9', route: '/smart-queue', soon: true },
    { id: 'party', label: t.profile.menu.partyBooking, Icon: PartyIcon, iconColor: '#FF34E0', route: '/party-booking', soon: true },
    { id: 'rating', label: t.profile.menu.rating, Icon: TrophyIcon, iconColor: '#F59E0B', route: '/rating', soon: true },
    { id: 'qr', label: t.profile.menu.qrScan, Icon: QrIcon, iconColor: '#00CFFF', route: '/qr-scan' },
    { id: 'help', label: t.profile.menu.help, Icon: MessageCircleIcon, iconColor: '#22C55E', route: '/help-support' },
    { id: 'settings', label: t.profile.menu.settings, Icon: SettingsIcon, iconColor: '#8B95A8', route: '/settings' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00CFFF" />
        }
      >
        <View style={styles.profileCard}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/profile-edit')}
            style={styles.avatarBtn}
            accessibilityRole="button"
            accessibilityLabel={displayName}
          >
            <LinearGradient
              colors={['#7C3AED', '#FF34E0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <UserAvatar avatarUrl={user?.avatar_url} size={44} ring={false} />
            </LinearGradient>
            <View style={styles.onlineDot} />
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <View style={styles.greetingRow}>
              <Text style={styles.greetingText} numberOfLines={1}>
                {greeting.text}
              </Text>
              <Text style={styles.greetingEmoji}>{greeting.emoji}</Text>
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.levelChip}>
                <Text style={styles.levelChipText} numberOfLines={1}>
                  {rankName}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.notifBtn}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? t.home.bellWithUnreadA11y.replace(
                    '{n}',
                    unreadCount > 99 ? '99+' : String(unreadCount),
                  )
                : t.home.bellA11y
            }
          >
            <BellIcon size={18} color="#00CFFF" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {/* 99+ cap matches HomeHeader for consistency. Pre-fix
                      was 9+ which felt too small for an active user with
                      a dozen+ unread notifications. */}
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.settingsBtn}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel={t.profile.menu.settings}
          >
            <SettingsIcon size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {totalSpent != null ? formatSum(totalSpent) : '—'}
            </Text>
            <Text style={styles.statLabel}>{t.profile.statTotalScore}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {sessionsCount != null ? String(sessionsCount) : '—'}
            </Text>
            <Text style={styles.statLabel}>{t.profile.statGames}</Text>
          </View>
        </View>

        {/* Favorite games section removed — the BE doesn't yet track
            game-time per user, and the hardcoded "Dota 2 / 214h" tiles
            misled every account into thinking their playtime was being
            recorded. Re-add once `/client/game-profiles` (already on
            the API) carries hours-per-game in its response. */}

        <Text style={styles.sectionTitle}>{t.profile.quickLinks}</Text>

        <View style={styles.quickRow}>
          {QUICK_LINKS.map(({ id, label, Icon, color, route, soon }) => {
            // Soon items become dimmed, non-tappable cards with a
            // small "Soon" ribbon — same affordance as the main menu
            // below. Live items stay tappable.
            const inner = (
              <>
                <View
                  style={[
                    styles.quickIcon,
                    { backgroundColor: `${color}1F`, opacity: soon ? 0.5 : 1 },
                  ]}
                >
                  <Icon size={18} color={color} />
                </View>
                <Text
                  style={[styles.quickLabel, soon && styles.menuLabelDisabled]}
                >
                  {label}
                </Text>
                {soon && (
                  <View style={styles.quickSoonRibbon}>
                    <Text style={styles.quickSoonRibbonText}>{t.profile.soon}</Text>
                  </View>
                )}
              </>
            );
            if (soon) {
              return (
                <View
                  key={id}
                  style={styles.quickItem}
                  accessibilityRole="summary"
                  accessibilityLabel={`${label}, ${t.profile.soon}`}
                >
                  {inner}
                </View>
              );
            }
            return (
              <TouchableOpacity
                key={id}
                style={styles.quickItem}
                activeOpacity={0.7}
                onPress={() => router.push(route)}
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                {inner}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Loyalty / rewards card — non-tappable until the rewards
            backend lands. Per product feedback the "Soon" signal
            moves OFF the title (no badge) and ONTO the button label:
            instead of "View rewards" the CTA reads "Tez orada" so
            the marketing copy stays clean but the action's status
            is obvious at a glance. Restore the
            `<TouchableOpacity onPress={() => router.push('/achievements')}>`
            wrapper + original button label when rewards launch. */}
        <View>
          <LinearGradient
            colors={['#3B1F6F', '#1F1B4E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loyaltyCard}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.loyaltyTitle}>{t.profile.loyaltyTitle}</Text>
              <Text style={styles.loyaltySubtitle}>{t.profile.loyaltySub}</Text>
              <View style={[styles.loyaltyBtn, styles.loyaltyBtnDisabled]}>
                <Text style={[styles.loyaltyBtnText, styles.loyaltyBtnTextDisabled]}>
                  {t.profile.loyaltyBtnSoon}
                </Text>
              </View>
            </View>
            <View style={styles.loyaltyIconWrap}>
              <View style={styles.loyaltyIconBg}>
                <GiftIcon size={42} color="#FF34E0" />
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.menuList}>
          {MENU.map((item, idx) => {
            const isLast = idx === MENU.length - 1;
            // `soon` items render as DIMMED non-tappable rows with the
            // "Soon" badge and no chevron — the user reads them as
            // "this is coming, you can't open it yet". Pre-fix the
            // soon rows were tappable and led to a placeholder screen
            // inside; the user couldn't tell at a glance that it
            // wasn't a working feature. Per product feedback we now
            // stop the navigation at the menu row.
            const content = (
              <>
                <View style={styles.menuLeft}>
                  <View
                    style={[
                      styles.menuIcon,
                      {
                        backgroundColor: `${item.iconColor}1F`,
                        opacity: item.soon ? 0.5 : 1,
                      },
                    ]}
                  >
                    <item.Icon size={15} color={item.iconColor} />
                  </View>
                  <Text
                    style={[styles.menuLabel, item.soon && styles.menuLabelDisabled]}
                  >
                    {item.label}
                  </Text>
                </View>
                <View style={styles.menuRight}>
                  {item.soon ? (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonText}>{t.profile.soon}</Text>
                    </View>
                  ) : (
                    <ChevronRightIcon size={16} color="#8B95A8" />
                  )}
                </View>
              </>
            );

            // Non-tappable static row for soon items so the user
            // can't accidentally navigate into the placeholder.
            if (item.soon) {
              return (
                <View
                  key={item.id}
                  style={[styles.menuItem, isLast && styles.menuItemLast]}
                  accessibilityRole="summary"
                  accessibilityLabel={`${item.label}, ${t.profile.soon}`}
                >
                  {content}
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, isLast && styles.menuItemLast]}
                activeOpacity={0.7}
                onPress={() => item.route && router.push(item.route)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                {content}
              </TouchableOpacity>
            );
          })}
        </View>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
    gap: 10,
  },
  avatarBtn: {
    width: 48,
    height: 48,
    position: 'relative',
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 2,
  },
  // (Removed: `avatar` style — UserAvatar component owns its own
  // bitmap styling internally, so the wrapper style here was dead.)
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#080F16',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  greetingText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    letterSpacing: 0.1,
  },
  greetingEmoji: {
    fontSize: 12.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  levelChip: {
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 7,
  },
  levelChipText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 10.5,
    color: '#A78BFA',
    letterSpacing: 0.3,
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#080F16',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 9,
    color: '#FFFFFF',
    lineHeight: 11,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#141823',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#8B95A8',
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14.5,
    color: Colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  // (Removed: `sectionRow` / `sectionAction` styles for the old
  // "header with view-all action" pattern, plus `gamesRow` /
  // `gameCard` / `gameImage` / `gameOverlay` / `gameContent` /
  // `gameName` / `gameHours` for the Favourite Games section that was
  // dropped pre-launch — the BE doesn't yet track per-user game-time,
  // so the hardcoded fixture tiles were misleading. Restore when
  // `/client/game-profiles` carries hours-per-game in its response.)
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 0,
  },
  quickItem: {
    flex: 1,
    backgroundColor: '#141823',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  quickSoonRibbon: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 207, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.4)',
  },
  quickSoonRibbonText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 8,
    color: '#00CFFF',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11,
    color: Colors.text,
  },
  loyaltyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
  },
  loyaltyTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 16,
    color: Colors.text,
  },
  // (Removed: `loyaltyTitleRow` — pre-fix it wrapped the title + a
  // "Beta/Soon" badge in a row. The badge moved off the title and
  // onto the button label per product feedback, so the row layout is
  // no longer needed; the title is now a single Text element.)
  loyaltySubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    lineHeight: 17,
    color: '#C4B5FD',
    marginTop: 4,
  },
  loyaltyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 12,
  },
  loyaltyBtnDisabled: {
    backgroundColor: 'rgba(124, 58, 237, 0.35)',
  },
  loyaltyBtnText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11.5,
    color: Colors.white,
  },
  loyaltyBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  loyaltyIconWrap: {
    width: 88,
    alignItems: 'center',
  },
  loyaltyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 52, 224, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuList: {
    marginTop: 18,
    backgroundColor: '#141823',
    borderRadius: 14,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13.5,
    color: Colors.text,
    flex: 1,
  },
  menuLabelDisabled: {
    opacity: 0.45,
  },
  soonBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  soonText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 10.5,
    color: '#00E5FF',
    letterSpacing: 0.5,
  },
});
