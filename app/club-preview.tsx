import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { Images } from '../constants/Images';
import SimpleHeader from '../components/common/SimpleHeader';
import StarIcon from '../components/icons/StarIcon';
import LocationPinIcon from '../components/icons/LocationPinIcon';
import * as clubsApi from '../lib/api/services/clubs';
import { getErrorMessage } from '../lib/api/client';
import type { ClubPreview } from '../lib/api/types';
import GamepadIcon from '../components/icons/GamepadIcon';
import LightningIcon from '../components/icons/LightningIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useDialog } from '../components/common/AppDialog';

export default function ClubPreviewScreen() {
  const t = useT();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { tenantId, code } = useLocalSearchParams<{ tenantId?: string; code?: string }>();

  const [club, setClub] = useState<ClubPreview | null>(null);
  const [loading, setLoading] = useState(true);
  // `joining` state was removed when this screen stopped doing
  // its own join — the button now navigates to /club-join (which
  // owns the password input + actual POST). No async transition
  // here means no loading flag.

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    // Cancellation guard — pre-fix tapping preview-A → back →
    // preview-B in quick succession could resolve preview-A's
    // promise AFTER preview-B's, clobbering the visible state
    // with the stale club. The cancelled flag short-circuits the
    // setClub call for any preview the user has already navigated
    // away from. Audit M4.
    let cancelled = false;
    (async () => {
      try {
        const data = await clubsApi.previewClub(Number(tenantId));
        if (cancelled) return;
        setClub(data);
      } catch (e) {
        if (cancelled) return;
        await dialog.alert({
          title: t.clubDetails.notFoundTitle,
          message: getErrorMessage(e),
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, t, dialog]);

  /**
   * Always route to /club-join when the user taps "Join".
   *
   * Pre-fix this screen tried to silently call `joinByCode(code)`
   * when a code was already in the route params — but the BE
   * requires a `password` field too, and this screen has no input
   * for it. Every silent-join attempt 422'd with "The password
   * field is required" and the user saw a generic error dialog
   * with no way to act.
   *
   * Routing to /club-join (the dedicated form) lets the user enter
   * the code + password together. We forward the prefilled code as
   * a route param so they don't have to re-type it.
   */
  const onJoin = () => {
    router.push({
      pathname: '/club-join',
      params: code ? { code: String(code) } : {},
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]} edges={['top']}>
        <ActivityIndicator color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!club) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <SimpleHeader title={t.clubPreviewScreen.headerTitle} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{t.clubDetails.notFoundTitle}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={t.clubPreviewScreen.headerTitle} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.coverWrap}>
          <Image source={{ uri: club.cover_url || Images.clubs[0] }} style={styles.cover} />
          <LinearGradient
            colors={['transparent', 'rgba(8,15,22,0.9)']}
            style={StyleSheet.absoluteFillObject}
          />
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{club.name}</Text>
          <View style={styles.metaRow}>
            {club.rating != null && (
              <View style={styles.ratingWrap}>
                <StarIcon size={12} color="#F59E0B" filled />
                <Text style={styles.ratingText}>{Number(club.rating).toFixed(1)}</Text>
              </View>
            )}
            {club.city && (
              <View style={styles.metaItem}>
                <LocationPinIcon size={12} color="#8B95A8" />
                <Text style={styles.metaText}>{club.city}</Text>
              </View>
            )}
          </View>

          {club.description && (
            <Text style={styles.description}>{club.description}</Text>
          )}

          <View style={styles.featuresRow}>
            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <GamepadIcon size={20} color="#00CFFF" />
              </View>
              <Text style={styles.featureLabel}>{t.clubDetails.feature1.replace('\n', ' ')}</Text>
            </View>
            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <GamepadIcon size={20} color="#7C3AED" />
              </View>
              <Text style={styles.featureLabel}>{t.clubDetails.feature2.replace('\n', ' ')}</Text>
            </View>
            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <LightningIcon size={20} color="#F59E0B" />
              </View>
              <Text style={styles.featureLabel}>{t.clubDetails.feature3.replace('\n', ' ')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* "Klubga qo'shilish" / "Присоединиться" / "Join the club"
            CTA — full-width 52pt pill sized for the longer Cyrillic
            label without truncating. */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onJoin}
          accessibilityRole="button"
          accessibilityLabel={t.clubPreviewScreen.joinBtn}
          style={joinBtnStyles.btn}
        >
          <LinearGradient
            colors={['#3B5BF5', '#8B3DF5']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={joinBtnStyles.fill}
          >
            <Text
              style={joinBtnStyles.label}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {t.clubPreviewScreen.joinBtn}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: Fonts.inter.medium, fontSize: 14, color: '#8B95A8' },
  scroll: { paddingBottom: 16 },
  coverWrap: { height: 200, position: 'relative' },
  cover: { width: '100%', height: '100%', backgroundColor: '#1A1F2B' },
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  name: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: Fonts.inter.semiBold, fontSize: 13, color: Colors.text },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: Fonts.inter.regular, fontSize: 12.5, color: '#8B95A8' },
  description: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#8B95A8',
    marginTop: 8,
  },
  featuresRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  featureCard: {
    flex: 1,
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  featureLabel: { fontFamily: Fonts.inter.medium, fontSize: 11, color: Colors.text, textAlign: 'center' },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
});

const joinBtnStyles = StyleSheet.create({
  btn: { height: 52, borderRadius: 999, alignSelf: 'stretch', overflow: 'hidden' },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});
