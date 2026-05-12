import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import HomeHeader from '../../components/home/HomeHeader';
import ClubsTabs from '../../components/home/ClubsTabs';
import PromotionsList from '../../components/home/PromotionsList';
import AiBanner from '../../components/home/AiBanner';
import SectionHeader from '../../components/ui/SectionHeader';
import FadeInView from '../../components/common/FadeInView';
import { useT } from '../../lib/i18n/LocaleProvider';
import { useAuth } from '../../store/AuthProvider';
import { useDiscoverClubs } from '../../lib/hooks/useDiscoverClubs';

export default function HomeScreen() {
  const t = useT();
  const { refreshMe } = useAuth();
  const { refresh: refreshClubs } = useDiscoverClubs();
  const [refreshing, setRefreshing] = useState(false);
  // `refreshKey` is a monotonically-increasing counter the header
  // listens to. Pull-to-refresh doesn't change focus (the home screen
  // stays focused throughout), so the HomeHeader's useFocusEffect
  // doesn't auto-refire. Bumping this counter is the explicit signal
  // to re-fetch the rank chip + bell badge alongside the auth/clubs
  // re-fetch.
  const [refreshKey, setRefreshKey] = useState(0);

  // Pre-fix this was a fake 1.2s timeout — the spinner span gave the
  // illusion of a refresh while no data actually re-fetched. Now we
  // fan out to the two underlying data sources (auth.me for clubs +
  // memberships, useDiscoverClubs.refresh for the public catalogue)
  // and only stop the spinner once both resolve. The header data is
  // re-fetched via `refreshKey` so the user sees a coherent refresh
  // across every block on the screen, not just the carousels.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    try {
      await Promise.allSettled([refreshMe(), refreshClubs()]);
      // Bump after the auth/clubs refresh resolves so the header
      // re-fetches against the fresh tenant context. The increment is
      // atomic from the user's perspective — the bell badge updates
      // alongside the carousels rather than racing them.
      setRefreshKey((n) => n + 1);
    } finally {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setRefreshing(false);
    }
  }, [refreshMe, refreshClubs]);

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
            colors={['#00CFFF']}
            progressBackgroundColor="#141823"
          />
        }
      >
        <HomeHeader refreshKey={refreshKey} />

        <FadeInView delay={0}>
          <ClubsTabs loading={refreshing} />
        </FadeInView>

        <FadeInView delay={120}>
          {/* `actionLabel` without `onAction` was a no-op tap target —
              users could tap "Vse" and nothing happened. Wired to the
              dedicated promotions list screen so the link matches what
              the inline view-all card at the tail of the carousel does. */}
          <SectionHeader
            title={t.home.promotionsTitle}
            actionLabel={t.home.viewAll}
            onAction={() => router.push('/promotions-list')}
            emoji="🔥"
          />
          <PromotionsList loading={refreshing} />
        </FadeInView>

        <FadeInView delay={220}>
          {/* AiBanner is non-tappable + carries its own "Soon" badge
              so users see the upcoming feature without being routed
              into the placeholder screen. Pre-fix the banner pushed
              to `/ai-assistant` (now ComingSoonView) which felt
              like a broken promise — the badge now sets expectations
              without the navigation step. */}
          <AiBanner />
        </FadeInView>

        <View style={styles.bottomSpacer} />
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
    paddingBottom: 20,
    paddingTop: 4,
  },
  bottomSpacer: {
    height: 8,
  },
});
