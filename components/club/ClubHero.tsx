import { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Animated,
  Platform,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2 } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';
import { useToast } from '../common/Toast';
import { getErrorMessage } from '../../lib/api/client';
import { useFavoriteClubs } from '../../lib/state/useFavoriteClubs';
import BackIcon from '../icons/BackIcon';
import HeartIcon from '../icons/HeartIcon';

interface Props {
  topInset: number;
  imageUri: string;
  isOpen: boolean;
  open24h: boolean;
  clubId: string;
  clubName: string;
  scrollY?: Animated.Value;
}

const HERO_HEIGHT = 320;

export default function ClubHero({
  topInset,
  imageUri,
  isOpen,
  open24h,
  clubId,
  clubName,
  scrollY,
}: Props) {
  const t = useT();
  const toast = useToast();
  const { isFavorite, toggle } = useFavoriteClubs();
  const favorited = isFavorite(clubId);

  const fallbackY = useRef(new Animated.Value(0)).current;
  const y = scrollY ?? fallbackY;

  // Parallax: image moves at half speed of scroll (positive translate to
  // counteract scroll → image appears to scroll slower). Stretches/scales
  // up when user pulls down (overscroll).
  const imageTranslate = y.interpolate({
    inputRange: [-200, 0, HERO_HEIGHT],
    outputRange: [-100, 0, HERO_HEIGHT * 0.5],
    extrapolate: 'clamp',
  });
  const imageScale = y.interpolate({
    inputRange: [-200, 0, HERO_HEIGHT],
    outputRange: [1.5, 1, 1],
    extrapolate: 'clamp',
  });

  const onToggleFavorite = () => {
    const wasFavorite = favorited;
    toggle(clubId);
    // Tactile feedback on a heart tap is the convention every modern
    // app uses (Instagram, X, Apple Music). Light impact reads as
    // "registered" without being intrusive. Web has no Haptics module
    // so the call is guarded — RN warns but doesn't crash without it.
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    toast.info(wasFavorite ? t.clubDetails.favoriteRemoved : t.clubDetails.favoriteAdded);
  };

  const onShare = async () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    // Build a deep-link the recipient can tap to open this exact club
    // inside the app (or the install page on a device without Nexora).
    // expo-linking's `createURL` builds the right scheme for the
    // current runtime — `nexora://club-details?clubId=42` on dev,
    // a universal-link URL on prod. Pre-fix the share message was
    // text-only ("Posmotrite klub X v prilojenii Nexora!"), giving
    // the recipient no actionable link.
    const url = Linking.createURL('/club-details', { queryParams: { clubId } });
    const message = `${t.clubDetails.shareMessage.replace('{name}', clubName)}\n${url}`;
    try {
      const result = await Share.share({ message, url });
      // iOS returns `dismissedAction` when the user closes the sheet
      // without sharing — that's a normal cancel, not an error, so we
      // skip the toast. Android returns `result.action` differently
      // but the same logic holds: only surface a toast when an actual
      // throw happens.
      if (result.action === Share.dismissedAction) {
        // Quietly ignore — user cancelled.
      }
    } catch (e) {
      // Real failure (e.g., share extension crashed). Pre-fix this was
      // a silent empty catch — the user tapped Share, the sheet never
      // appeared, and they had no idea why.
      toast.error(getErrorMessage(e) || t.clubDetails.shareError);
    }
  };

  const openLabel = isOpen
    ? open24h
      ? t.clubDetails.open24h
      : t.clubDetails.open
    : t.clubDetails.closed;

  return (
    <View style={styles.heroWrap}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ translateY: imageTranslate }, { scale: imageScale }] },
        ]}
      >
        <ImageBackground source={{ uri: imageUri }} style={styles.hero}>
          <LinearGradient
            colors={['rgba(8,15,22,0.75)', 'rgba(8,15,22,0.25)', 'rgba(8,15,22,0.92)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </ImageBackground>
      </Animated.View>

      <View style={[styles.topBar, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <BackIcon size={20} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel={t.clubDetails.shareA11y}
          >
            <Share2 size={18} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={onToggleFavorite}
            accessibilityRole="button"
            accessibilityState={{ selected: favorited }}
            accessibilityLabel={t.clubDetails.favoriteToggleA11y}
          >
            <HeartIcon size={20} color={favorited ? '#EF4444' : Colors.text} filled={favorited} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.brandOverlay} pointerEvents="none">
        <Text style={styles.brandText}>NEXORA</Text>
      </View>

      <View style={[styles.openBadge, !isOpen && styles.closedBadge]}>
        <View style={[styles.openDot, !isOpen && styles.closedDot]} />
        <Text style={[styles.openText, !isOpen && styles.closedText]}>{openLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  hero: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 24, 35, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  brandOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  brandText: {
    fontFamily: Fonts.orbitron.black,
    fontSize: 38,
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 6,
    textShadowColor: 'rgba(0, 229, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  openBadge: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  closedBadge: {},
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  closedDot: {
    backgroundColor: '#EF4444',
  },
  openText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11.5,
    color: '#22C55E',
  },
  closedText: {
    color: '#EF4444',
  },
});
