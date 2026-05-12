import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import ClubCard from './ClubCard';
import SkeletonClubCard from './SkeletonClubCard';
import { useDiscoverClubs } from '../../lib/hooks/useDiscoverClubs';
import { useT } from '../../lib/i18n/LocaleProvider';
import { useAuth } from '../../store/AuthProvider';
import LocationPinIcon from '../icons/LocationPinIcon';

type TabKey = 'mine' | 'all';

const MAX_VISIBLE = 5;
const CARD_WIDTH = 280;
const CARD_GAP = 12;

// Module-level memory for the most-recently selected tab. Pre-fix the
// tab state was per-mount `useState('mine')`, so navigating away from
// home (to club-details, notifications, profile, etc.) and coming back
// always snapped the user back to "Mine". For a user who's actively
// browsing "Other clubs", that's a visible regression — every tap into
// a card threw away their tab choice.
//
// We persist the choice in memory only — restarting the app
// intentionally starts on "Mine" again, which is the right default for
// a fresh session.
let lastTabChoice: TabKey = 'mine';

interface Props {
  loading?: boolean;
}

export default function ClubsTabs({ loading = false }: Props) {
  const t = useT();
  const [tab, setTabState] = useState<TabKey>(lastTabChoice);

  // Wrap the setter so module-level memory and the local useState stay
  // in lockstep. Any future caller of `setTab` automatically writes to
  // the singleton; mounting consumers read the singleton's last value.
  const setTab = (next: TabKey) => {
    lastTabChoice = next;
    setTabState(next);
  };
  const { clubs, loading: clubsLoading, refresh } = useDiscoverClubs();
  const { clubs: joinedClubs, currentTenantId } = useAuth();

  // Re-fetch /discover/clubs whenever the user's membership signature
  // changes — joining a new club or switching tenants should make the
  // "Mine" tab pick up the change without forcing a manual pull-to-
  // refresh. Skips the very first run because `useDiscoverClubs` is
  // already firing its mount fetch then, which would double-hit the
  // endpoint.
  const membershipSig = useMemo(
    () => joinedClubs.map((c) => c.tenant_id).sort().join(','),
    [joinedClubs],
  );
  const firstMembershipRunRef = useRef(true);
  useEffect(() => {
    if (firstMembershipRunRef.current) {
      firstMembershipRunRef.current = false;
      return;
    }
    void refresh();
    // `refresh` is stable per hook instance; tracking membershipSig +
    // currentTenantId is what we care about. Eslint can't see through
    // the stable closure so the rule is suppressed by intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membershipSig, currentTenantId]);

  // `memberSet` is derived once for both tabs — the "mine" tab
  // INCLUDES rows that match, the "other" tab EXCLUDES them so the
  // two tabs never show identical leading cards. Pre-fix the "all"
  // tab returned every club regardless of membership; the first 2-3
  // cards almost always overlapped with "mine" and the tab toggle
  // read as broken to users (reported as UX-H1).
  const memberSet = useMemo(
    () => new Set(joinedClubs.map((c) => String(c.tenant_id))),
    [joinedClubs],
  );

  const fullList = useMemo(() => {
    if (tab === 'mine') {
      // Trust AuthProvider's memberships list when it's populated —
      // the BE-derived `joined` flag on `/discover/clubs` proved
      // unreliable for fresh sessions where the request runs before
      // the per-tenant token settles. Falling back to `joined` only
      // when we genuinely have no auth-side data avoids the empty-
      // "Mine"-tab race users hit on cold start.
      if (joinedClubs.length > 0) {
        return clubs.filter((c) => memberSet.has(String(c.id)));
      }
      return clubs.filter((c) => c.joined);
    }
    // "other" tab: show clubs the user has NOT joined yet. Both
    // the auth-side membership list (preferred) and the BE-side
    // `joined` flag (fallback) are checked so we never show a
    // duplicate of what's already in "Mine" above.
    if (joinedClubs.length > 0) {
      return clubs.filter((c) => !memberSet.has(String(c.id)));
    }
    return clubs.filter((c) => !c.joined);
  }, [tab, clubs, joinedClubs, memberSet]);
  // Combine the parent-supplied loading flag (used for the home-screen
  // overall skeleton) with our own fetch state — either keeps the
  // skeleton up while the discover list is in flight.
  const showSkeleton = loading || (clubsLoading && fullList.length === 0);

  const list = useMemo(() => fullList.slice(0, MAX_VISIBLE), [fullList]);
  const hasMore = fullList.length > MAX_VISIBLE;
  const remaining = fullList.length - MAX_VISIBLE;

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'mine', label: t.home.clubsTabs.mine },
    { key: 'all', label: t.home.clubsTabs.all },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.tabsRow}>
        {TABS.map(({ key, label }) => {
          const isActive = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={label}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#3B5BF5', '#8B3DF5']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.tabActiveGradient}
                >
                  <Text style={styles.tabTextActive} numberOfLines={1}>
                    {label}
                  </Text>
                </LinearGradient>
              ) : (
                <Text style={styles.tabText} numberOfLines={1}>
                  {label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {showSkeleton ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          style={styles.scrollOverflow}
          scrollEnabled={false}
        >
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.cardWrap}>
              <SkeletonClubCard />
            </View>
          ))}
        </ScrollView>
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <LocationPinIcon size={26} color="#00CFFF" />
          </View>
          {tab === 'mine' ? (
            // User hasn't joined any club yet. The "Barcha klublar"
            // tab right above is the obvious browse path, so we only
            // surface the join-by-code CTA here — no duplicate "see
            // all clubs" link, which would just race the tab.
            <>
              <Text style={styles.emptyTitle}>{t.home.emptyTitle}</Text>
              <Text style={styles.emptySub}>{t.home.emptySub}</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/club-join')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t.home.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>{t.home.emptyBtn}</Text>
              </TouchableOpacity>
            </>
          ) : (
            // The "other clubs" tab is empty for ONE of two reasons:
            //   1. The user has joined every club the BE returned —
            //      no new clubs to discover. Show a "fully explored"
            //      message with a hint to use the Discover tab for
            //      city-wide search.
            //   2. The BE returned no clubs at all (cold install,
            //      empty city). Show the legacy "no clubs" copy.
            <>
              <Text style={styles.emptyTitle}>
                {clubs.length === 0
                  ? t.home.allEmptyTitle
                  : t.home.otherEmptyTitle}
              </Text>
              <Text style={styles.emptySub}>
                {clubs.length === 0
                  ? t.home.allEmptySub
                  : t.home.otherEmptySub}
              </Text>
              {clubs.length > 0 && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/(tabs)/discover')}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t.home.otherEmptyBtn}
                >
                  <Text style={styles.emptyBtnText}>{t.home.otherEmptyBtn}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + CARD_GAP}
          snapToAlignment="start"
          style={styles.scrollOverflow}
        >
          {list.map((club) => (
            <View key={club.id} style={styles.cardWrap}>
              <ClubCard club={club} />
            </View>
          ))}

          {hasMore && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.viewAllCard}
              onPress={() => router.push({ pathname: '/clubs-list', params: { tab } })}
              accessibilityRole="button"
              accessibilityLabel={t.home.viewAll}
            >
              <View style={styles.viewAllArrow}>
                <Text style={styles.viewAllArrowText}>→</Text>
              </View>
              <Text style={styles.viewAllTitle}>{t.home.viewAll}</Text>
              <Text style={styles.viewAllSub}>
                {t.home.viewAllRemaining.replace('{n}', String(remaining))}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabActiveGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  tabText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#8B95A8',
  },
  tabTextActive: {
    color: Colors.white,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
  },
  scrollOverflow: {
    marginHorizontal: -16,
  },
  scroll: {
    gap: CARD_GAP,
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  cardWrap: {
    width: CARD_WIDTH,
  },
  viewAllCard: {
    width: 160,
    backgroundColor: '#141823',
    borderRadius: 18,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 207, 255, 0.25)',
    borderStyle: 'dashed',
    gap: 8,
  },
  viewAllArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 207, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllArrowText: {
    fontSize: 22,
    color: '#00CFFF',
    fontFamily: Fonts.inter.bold,
  },
  viewAllTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
    textAlign: 'center',
  },
  viewAllSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
    textAlign: 'center',
  },
  empty: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 26,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 18,
  },
  // 44pt minimum tap target (iOS HIG / Material guidelines). The
  // previous 11 + ~18 lineHeight totalled ~40pt and missed the bar.
  emptyBtn: {
    backgroundColor: '#00CFFF',
    paddingHorizontal: 22,
    paddingVertical: 13,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 999,
    marginTop: 8,
  },
  emptyBtnText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#0B0F16',
  },
});
