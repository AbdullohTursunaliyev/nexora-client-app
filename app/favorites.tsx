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
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import HeartIcon from '../components/icons/HeartIcon';
import StarIcon from '../components/icons/StarIcon';
import BackIcon from '../components/icons/BackIcon';
import HomeIcon from '../components/icons/HomeIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useDiscoverClubs } from '../lib/hooks/useDiscoverClubs';
import { useFavoriteClubs, clearFavorites } from '../lib/state/useFavoriteClubs';
import { useDialog } from '../components/common/AppDialog';
import { useToast } from '../components/common/Toast';

// LayoutAnimation opt-in removed — `UIManager.setLayoutAnimation
// EnabledExperimental` is a no-op in the New Architecture (RN 0.74+)
// and emits a yellow-box warning on every mount. Android in the
// Bridgeless engine enables LayoutAnimation automatically, so the
// opt-in was both useless AND noisy.

/**
 * /favorites — the user's hand-curated "saved clubs" list.
 *
 * Single source of truth: `useFavoriteClubs` (a module-level
 * singleton backed by AsyncStorage). The hook returns `entries`
 * sorted newest-first so a freshly saved club lands at the top of
 * the list — pre-fix the list inherited the alphabetic discover
 * order, which made a "where did I just save?" tap feel lost in
 * the middle of the list.
 *
 * Heart icon on each row is a remove-from-favorites tap target.
 * Tap removes immediately with a smooth height collapse
 * (LayoutAnimation) + success haptic + toast — the toggle is
 * reversible (tap the heart on club-details again to re-add) so
 * we don't gate on a confirm dialog for every tap.
 *
 * "Clear all" CTA appears once the user has 3+ favourites — keeps
 * the screen clean below the threshold but offers an exit once the
 * list grows unwieldy. Always behind a destructive confirm dialog.
 *
 * Joined clubs are NOT shown here — those live under the profile's
 * "Mening klublarim" / clubs-switch entry. The two concepts (joined
 * vs. saved) intentionally stay separate so the user keeps full
 * control over what they've curated vs. what they're a member of.
 */
export default function FavoritesScreen() {
  const t = useT();
  const dialog = useDialog();
  const toast = useToast();
  const { clubs, refresh: refreshClubs } = useDiscoverClubs();
  const { entries, toggle, ready } = useFavoriteClubs();

  // Resolve the favorite entries into full MapClub rows from the
  // discover catalog, preserving the entries' newest-first order.
  // Anything that no longer exists in the catalog (rare — operator
  // removed the club) is silently dropped from the list; we don't
  // surface a "missing club" error because the user can't act on it.
  const favClubs = useMemo(() => {
    const byId = new Map(clubs.map((c) => [c.id, c]));
    return entries
      .map((e) => byId.get(e.id))
      .filter((c): c is NonNullable<typeof c> => !!c);
  }, [clubs, entries]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshClubs();
    } finally {
      setRefreshing(false);
    }
  }, [refreshClubs]);

  const onUnfavorite = (id: string, clubName: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    // LayoutAnimation runs the height collapse for us — without it
    // the row instantly disappears, which feels jarring when the
    // list rearranges. easeInEaseOut is the iOS default and reads
    // as a polished "remove" gesture.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggle(id);
    // Toast confirms what just happened and tells the user the
    // action is reversible. Pre-fix there was no feedback — a
    // tap-to-remove that looked identical to an accidental scroll
    // dismissed the row with no breadcrumb.
    toast.info(t.favorites.removedToast.replace('{name}', clubName));
  };

  const onClearAll = async () => {
    const ok = await dialog.confirm({
      title: t.favorites.clearAllTitle,
      message: t.favorites.clearAllMessage.replace('{n}', String(favClubs.length)),
      confirmLabel: t.favorites.clearAllConfirm,
      cancelLabel: t.favorites.clearAllCancel,
      destructive: true,
    });
    if (!ok) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    clearFavorites();
    toast.info(t.favorites.clearedToast);
  };

  // Show "Clear all" only when there's enough to clear — single
  // entries are easier to swipe-tap individually, the action button
  // would just clutter the header.
  const showClearAll = favClubs.length >= 3;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
        >
          <BackIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.favorites.headerTitle}</Text>
        {showClearAll ? (
          <TouchableOpacity
            onPress={onClearAll}
            activeOpacity={0.7}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel={t.favorites.clearAllConfirm}
          >
            <Text style={styles.clearBtnText}>{t.favorites.clearAllAction}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      {/* Count subtitle — gives the user a quick "how many saved"
          read without scrolling. Pre-fix the screen jumped straight
          into the list with no metadata, so a user with 1 favourite
          and a user with 47 saw the same header. */}
      {ready && favClubs.length > 0 && (
        <Text style={styles.countSubtitle}>
          {t.favorites.countLabel.replace('{n}', String(favClubs.length))}
        </Text>
      )}

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
        {/* Wait for AsyncStorage hydrate before deciding "empty" —
            pre-hydrate the singleton is empty by default and the
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
            <FavoriteRow
              key={c.id}
              club={c}
              metaPs={t.favorites.metaPs}
              fallbackName={t.favorites.fallbackName}
              onPress={() =>
                router.push({ pathname: '/club-details', params: { clubId: c.id } })
              }
              onUnfavorite={() => onUnfavorite(c.id, c.name || t.favorites.fallbackName)}
              removeA11yLabel={t.clubDetails.favoriteToggleA11y}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Single row component. Owns its own image-load failure flag so a
 * broken URL on one row doesn't poison the next row's image (image
 * load errors are per-Image instance — keeping the fallback state
 * local is the natural shape).
 */
function FavoriteRow({
  club,
  metaPs,
  fallbackName,
  onPress,
  onUnfavorite,
  removeA11yLabel,
}: {
  club: {
    id: string;
    name: string;
    image: string;
    rating: number;
    distanceKm: number;
    pcCount: number;
    hasPSZone: boolean;
  };
  metaPs: string;
  fallbackName: string;
  onPress: () => void;
  onUnfavorite: () => void;
  removeA11yLabel: string;
}) {
  // Local image-error flag — flips true when the remote cover URL
  // fails to load. Render falls back to a HomeIcon tile so the row
  // doesn't show a blank white box when the operator's image is
  // broken / deleted / behind a slow CDN.
  const [imageBroken, setImageBroken] = useState(false);
  const hasImage = !!club.image && !imageBroken;

  return (
    <TouchableOpacity
      style={styles.clubCard}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={club.name || fallbackName}
    >
      {hasImage ? (
        <Image
          source={{ uri: club.image }}
          style={styles.clubImage}
          onError={() => setImageBroken(true)}
        />
      ) : (
        <View style={[styles.clubImage, styles.clubImageFallback]}>
          <HomeIcon size={20} color="#8B95A8" />
        </View>
      )}
      <View style={styles.clubInfo}>
        <View style={styles.clubTop}>
          <Text style={styles.clubName} numberOfLines={1}>
            {club.name || fallbackName}
          </Text>
          {/* Rating row is hidden when there are no reviews — pre-fix
              we showed "—" with a star, which read as "0/5 rating"
              to scanning users. No-rating clubs now show no rating
              chip at all. */}
          {club.rating > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>{club.rating.toFixed(1)}</Text>
              <StarIcon size={11} color="#F59E0B" filled />
            </View>
          )}
        </View>
        <Text style={styles.clubMeta} numberOfLines={1}>
          {club.distanceKm > 0 ? `${club.distanceKm.toFixed(1)} km · ` : ''}
          {club.pcCount} PC{club.hasPSZone ? ` · ${metaPs}` : ''}
        </Text>
      </View>
      {/* Tappable heart — taps remove from favorites (the inverse
          of the heart toggle on club-details). hitSlop widens the
          touch target to ~44pt without bloating the visible icon
          (object form is the iOS HIG-compliant way to express it). */}
      <TouchableOpacity
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        activeOpacity={0.6}
        onPress={onUnfavorite}
        accessibilityRole="button"
        accessibilityLabel={removeA11yLabel}
        accessibilityState={{ selected: true }}
      >
        <HeartIcon size={22} color="#EF4444" filled />
      </TouchableOpacity>
    </TouchableOpacity>
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
  // "Clear all" pill — sits in the header's right slot. Subtle
  // crimson tint so it reads as destructive without screaming.
  clearBtn: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12,
    color: '#EF4444',
  },
  // Compact count label under the header. Subtle grey so it doesn't
  // compete with the title above or the cards below.
  countSubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    paddingHorizontal: 16,
    paddingBottom: 10,
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
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  // Fallback tile when the cover URL is broken or empty — a small
  // dark square with a home icon centred. Same dimensions as the
  // real image so the row layout doesn't shift on load-error.
  clubImageFallback: {
    backgroundColor: '#1A1F2B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
