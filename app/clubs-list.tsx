import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import ClubCard from '../components/home/ClubCard';
import Button from '../components/common/Button';
import PlusIcon from '../components/icons/PlusIcon';
import { useDiscoverClubs } from '../lib/hooks/useDiscoverClubs';
import { useT } from '../lib/i18n/LocaleProvider';
import { useAuth } from '../store/AuthProvider';
import { Images } from '../constants/Images';

type TabKey = 'mine' | 'all';

export default function ClubsListScreen() {
  const t = useT();
  const { clubs: joinedClubs, refreshMe } = useAuth();
  const { clubs: allClubs, loading, refresh: refreshDiscover } = useDiscoverClubs();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshDiscover(), refreshMe()]);
    } catch {
      // Refresh failures keep the existing list — no need to surface.
    } finally {
      setRefreshing(false);
    }
  };
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab: TabKey = params.tab === 'all' ? 'all' : 'mine';
  const [tab, setTab] = useState<TabKey>(initialTab);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'mine', label: t.clubsList.tabMine },
    { key: 'all', label: t.clubsList.tabAll },
  ];

  // "mine" tab prefers AuthProvider's club memberships (which carry the
  // user's per-tenant balance), falling back to the joined-flag clubs
  // from /discover when AuthProvider hasn't loaded yet. "all" goes
  // straight from /discover. ClubCard only reads the MapClub fields, so
  // we project AuthProvider's ClubMembership onto that shape using
  // metadata from the discover entry whenever a match exists.
  //
  // Image fallback: when the BE returns `club_logo: null` (current
  // seeded state for both demo tenants) we MUST substitute a bundled
  // image — `<Image source={{ uri: '' }} />` renders the gray broken-
  // image glyph on iOS/Android, not nothing. Use the same bundled
  // `Images.clubs[idx % N]` rotation that `useDiscoverClubs.adapt`
  // does so a synthesised "Mine" card matches a freshly-fetched
  // discover card pixel-for-pixel.
  const list = useMemo(() => {
    if (tab === 'mine') {
      if (joinedClubs.length === 0) return allClubs.filter((c) => c.joined);
      return joinedClubs.map((m, idx) => {
        const matched = allClubs.find((c) => String(c.id) === String(m.tenant_id));
        if (matched) {
          return {
            ...matched,
            name: m.tenant_name || matched.name,
            balance: m.balance,
            joined: true,
          };
        }
        const fallbackImage =
          (m.club_logo && m.club_logo.length > 0
            ? m.club_logo
            : Images.clubs[idx % Images.clubs.length]) ?? '';
        return {
          id: String(m.tenant_id),
          name: m.tenant_name,
          type: 'mixed' as const,
          lat: 0,
          lng: 0,
          rating: m.avg_rating ?? 0,
          reviewCount: m.reviews_count ?? 0,
          pcCount: m.pcs_total ?? 0,
          hasPSZone: false,
          open24h: false,
          isOpen: true,
          distanceKm: 0,
          image: fallbackImage,
          gallery: [fallbackImage],
          joined: true,
          verified: true,
          address: m.club_location ?? '',
          description: '',
          balance: m.balance,
        };
      });
    }
    // "other clubs" tab — show clubs the user has NOT joined yet so
    // the two tabs never display overlapping rows. Mirrors the same
    // filter the home `ClubsTabs` applies (UX-H1 fix).
    if (joinedClubs.length > 0) {
      const memberSet = new Set(joinedClubs.map((m) => String(m.tenant_id)));
      return allClubs.filter((c) => !memberSet.has(String(c.id)));
    }
    return allClubs.filter((c) => !c.joined);
  }, [tab, joinedClubs, allClubs]);

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom']}>
      <SimpleHeader title={t.clubsList.headerTitle} />

      <View style={styles.tabsRow}>
        {TABS.map(({ key, label }) => {
          const isActive = tab === key;
          return (
            <Pressable key={key} onPress={() => setTab(key)} style={styles.tab}>
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

      {loading && list.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color="#00CFFF" />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t.clubsList.emptyTitle}</Text>
          <Text style={styles.emptySub}>{t.clubsList.emptySub}</Text>
          <View style={styles.emptyBtnWrap}>
            <Button
              label={t.clubsList.joinBtn}
              variant="primary"
              size="md"
              icon={<PlusIcon size={16} color="#FFFFFF" />}
              onPress={() => router.push('/club-join')}
            />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00CFFF" />
          }
        >
          {list.map((club) => (
            <View key={club.id} style={styles.cardWrap}>
              <ClubCard club={club} />
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Tabs match `components/home/ClubsTabs.tsx` exactly — same height,
  // same gradient, same colors. Same control on the screen below
  // ("View all") should look the same as the one above it.
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 12,
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
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  cardWrap: {},
  empty: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
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
  emptyBtnWrap: {
    marginTop: 8,
  },
});
