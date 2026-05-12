import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import HeartIcon from '../components/icons/HeartIcon';
import StarIcon from '../components/icons/StarIcon';
import BackIcon from '../components/icons/BackIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useDiscoverClubs } from '../lib/hooks/useDiscoverClubs';
import { useFavoriteClubs } from '../lib/state/useFavoriteClubs';

/**
 * /favorites — the user's hand-curated "saved clubs" list.
 *
 * Single source of truth: `useFavoriteClubs` (AsyncStorage-backed
 * Set of club ids that the user explicitly heart-tapped on the
 * club-details hero). Pre-fix this screen filtered `clubs.joined`
 * and used joined-membership as a proxy for "favourite" — but
 * tapping the heart on club-details only wrote to AsyncStorage, so
 * the toggle had ZERO visible effect on this page (the user heart-
 * tapped a club, came here, saw nothing change). That bug is fixed
 * by reading the same Set the toggle writes to.
 *
 * Heart icon on each row is now a remove-from-favourites tap target
 * — pre-fix it was a decorative filled heart with
 * `pointerEvents="none"` because the BE had no favourites endpoint
 * to call. Local-only state means we don't need a BE call to
 * unfavourite; the tap just mutates the AsyncStorage Set.
 *
 * Joined clubs are NOT shown here — those live under the profile's
 * "Mening klublarim" / clubs-switch entry. The two concepts (joined
 * vs. saved) intentionally stay separate so the user keeps full
 * control over what they've curated vs. what they're a member of.
 */
export default function FavoritesScreen() {
  const t = useT();
  const { clubs, refresh: refreshClubs } = useDiscoverClubs();
  const { favorites, toggle, ready } = useFavoriteClubs();

  // Resolve the favourite ids into full MapClub rows from the
  // discover catalogue. Anything in the Set that no longer exists
  // in the catalogue (rare — club removed by operator) is silently
  // dropped from the list; we don't surface a "missing club" error
  // because the user can't act on it anyway.
  const favClubs = useMemo(
    () => clubs.filter((c) => favorites.has(c.id)),
    [clubs, favorites],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshClubs();
    } finally {
      setRefreshing(false);
    }
  }, [refreshClubs]);

  const onUnfavorite = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    toggle(id);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <BackIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.favorites.headerTitle}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00CFFF" />
        }
      >
        {/* Wait for AsyncStorage hydrate before deciding "empty" — pre-
            hydrate the favorites Set is empty by default and the
            empty-state would flash for ~50ms on first render, then
            replace with the real list. The `!ready` gate keeps the
            list area blank until we know what's in storage. */}
        {!ready ? null : favClubs.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <HeartIcon size={32} color="#EF4444" />
            </View>
            <Text style={styles.emptyTitle}>{t.favorites.emptyTitle}</Text>
            <Text style={styles.emptySub}>{t.favorites.emptySub}</Text>
            <TouchableOpacity
              style={styles.discoverBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/discover')}
              accessibilityRole="button"
              accessibilityLabel={t.favorites.discoverBtn}
            >
              <Text style={styles.discoverBtnText}>{t.favorites.discoverBtn}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          favClubs.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.clubCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push({ pathname: '/club-details', params: { clubId: c.id } })
              }
              accessibilityRole="button"
              accessibilityLabel={c.name}
            >
              <Image source={{ uri: c.image }} style={styles.clubImage} />
              <View style={styles.clubInfo}>
                <View style={styles.clubTop}>
                  <Text style={styles.clubName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingText}>
                      {c.rating > 0 ? c.rating.toFixed(1) : '—'}
                    </Text>
                    <StarIcon size={11} color="#F59E0B" filled />
                  </View>
                </View>
                <Text style={styles.clubMeta}>
                  {c.distanceKm > 0 ? `${c.distanceKm.toFixed(1)} km · ` : ''}
                  {c.pcCount} PC{c.hasPSZone ? ` · ${t.favorites.metaPs}` : ''}
                </Text>
              </View>
              {/* Tappable heart — taps remove from favourites (the
                  inverse of the heart toggle on club-details).
                  `hitSlop` widens the touch target without bloating
                  the visible icon. */}
              <TouchableOpacity
                hitSlop={10}
                activeOpacity={0.6}
                onPress={() => onUnfavorite(c.id)}
                accessibilityRole="button"
                accessibilityLabel={t.clubDetails.favoriteToggleA11y}
                accessibilityState={{ selected: true }}
              >
                <HeartIcon size={20} color="#EF4444" filled />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    color: Colors.text,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#141823',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  emptyCard: {
    flex: 1,
    backgroundColor: '#141823',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 12,
  },
  discoverBtn: {
    backgroundColor: '#00CFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverBtnText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#0B0F16',
  },
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  clubImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  clubInfo: {
    flex: 1,
    gap: 4,
  },
  clubTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  clubName: {
    flex: 1,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12,
    color: Colors.text,
  },
  clubMeta: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
});
