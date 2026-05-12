import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import StarIcon from '../icons/StarIcon';
import CloseIcon from '../icons/CloseIcon';
import NavigationIcon from '../icons/NavigationIcon';
import { MapClub } from '../../lib/data/clubs';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  club: MapClub;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /**
   * Optional explicit-close handler. When provided we render an X
   * button in the top-right of the card; without it the only way to
   * deselect was to navigate away or pick a different pin, which
   * confused users who tapped a marker by accident.
   */
  onClose?: () => void;
  /**
   * Optional handler for the in-app "Directions" CTA. When provided
   * we render a cyan pill button at the bottom of the card that asks
   * the orchestrator to fetch a route and overlay it on the map.
   * Omitted on the list-view variant (no map to overlay onto).
   */
  onShowDirections?: () => void;
  /** Whether the orchestrator is currently showing a route for this club. */
  routeActive?: boolean;
  /** Whether the route fetch is in flight — disables the button + shows spinner. */
  routeLoading?: boolean;
}

const SWIPE_THRESHOLD = 70;

export default function SelectedClubCard({
  club,
  onSwipeLeft,
  onSwipeRight,
  onClose,
  onShowDirections,
  routeActive = false,
  routeLoading = false,
}: Props) {
  const t = useT();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const dragX = useRef(new Animated.Value(0)).current;

  // Re-animate whenever club changes
  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [club.id, opacity, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        dragX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -SWIPE_THRESHOLD && onSwipeLeft) {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          Animated.timing(dragX, {
            toValue: -300,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            dragX.setValue(0);
            onSwipeLeft();
          });
        } else if (gesture.dx > SWIPE_THRESHOLD && onSwipeRight) {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          Animated.timing(dragX, {
            toValue: 300,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            dragX.setValue(0);
            onSwipeRight();
          });
        } else {
          Animated.spring(dragX, {
            toValue: 0,
            useNativeDriver: true,
            speed: 16,
            bounciness: 6,
          }).start();
        }
      },
    }),
  ).current;

  // Distance is computed from the user's GPS coords by the discover
  // screen and patched onto the MapClub before it reaches us. When the
  // user hasn't granted location yet (or we couldn't read it) the
  // value is 0 — in that case we drop the chip entirely rather than
  // show a misleading "0.0 km" pinned under the club name.
  const subtitle = [
    club.distanceKm > 0 ? `${club.distanceKm.toFixed(1)} km` : null,
    club.pcCount > 0 ? `${club.pcCount} PC` : null,
    club.hasPSZone ? t.components.clubPsZones : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const openText = club.isOpen
    ? club.open24h
      ? t.discover.open24h
      : t.discover.open
    : t.discover.closed;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        opacity,
        transform: [{ translateY }, { translateX: dragX }],
      }}
    >
      <View style={styles.card}>
        {(onSwipeLeft || onSwipeRight) && <View style={styles.dragIndicator} />}
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.85}
          // Pass the selected club's id so club-details renders THIS
          // club, not the user's currently-switched tenant. Pre-fix
          // the bare push opened whatever tenant the user happened
          // to be on, which on the discover map (where users are
          // browsing OTHER clubs) was the wrong club ~every time
          // (deep audit P1).
          onPress={() =>
            router.push({
              pathname: '/club-details',
              params: { clubId: club.id },
            })
          }
          accessibilityRole="button"
          accessibilityLabel={club.name}
        >
          <Image source={{ uri: club.image }} style={styles.thumbnail} />
          <View style={styles.info}>
            {/* `closeReservedRight` reserves space at the right end of
                the title row so the rating chip cannot drift under the
                absolutely-positioned X button in the card corner. Two
                separate widgets fighting for the same pixel is what
                made the X and the score read as crammed together. */}
            <View style={[styles.titleRow, onClose && styles.titleRowWithClose]}>
              <Text style={styles.name} numberOfLines={1}>
                {club.name}
              </Text>
              <View style={styles.rating}>
                <StarIcon size={11} color="#F59E0B" />
                <Text style={styles.ratingText}>{club.rating.toFixed(1)}</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <Text style={[styles.openText, !club.isOpen && styles.closedText]}>
              <Text style={!club.isOpen ? styles.closedDot : styles.openDot}>● </Text>
              {openText}
            </Text>
          </View>
        </TouchableOpacity>
        {/* Close button lives OUTSIDE the row so the rating + name
            layout doesn't have to accommodate it as a sibling. It
            still sits absolutely in the top-right of the card, but
            with a clear gap from the rating thanks to the right
            padding on `titleRowWithClose`. */}
        {onClose && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={12}
            activeOpacity={0.6}
          >
            <CloseIcon size={14} color="#8B95A8" />
          </TouchableOpacity>
        )}
        {/* In-app Directions CTA — visible only when the parent passes
            a handler (i.e. map mode, not list). Two visual states:
              • idle / inactive  → solid cyan "Yo'l ko'rsatish"
              • route on map     → outline "Yo'lni yashirish"
            The spinner state replaces the icon (not the label) so the
            button width stays stable and the tap target doesn't jump
            mid-fetch. */}
        {onShowDirections && (
          <TouchableOpacity
            style={[styles.directionsBtn, routeActive && styles.directionsBtnActive]}
            onPress={onShowDirections}
            activeOpacity={0.85}
            disabled={routeLoading}
            accessibilityRole="button"
            accessibilityLabel={
              routeActive ? t.discover.directionsHide : t.discover.directionsShow
            }
          >
            {routeLoading ? (
              <ActivityIndicator
                size="small"
                color={routeActive ? '#00CFFF' : '#0B0F16'}
              />
            ) : (
              <NavigationIcon
                size={14}
                color={routeActive ? '#00CFFF' : '#0B0F16'}
              />
            )}
            <Text
              style={[
                styles.directionsBtnText,
                routeActive && styles.directionsBtnTextActive,
              ]}
            >
              {routeLoading
                ? t.discover.directionsLoading
                : routeActive
                  ? t.discover.directionsHide
                  : t.discover.directionsShow}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dragIndicator: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(139, 149, 168, 0.35)',
    marginBottom: 4,
    marginTop: -2,
  },
  // No iOS shadow / Android elevation. The card sits over the map and
  // its dark slab already separates it visually. Earlier versions
  // layered a 32%-opacity black shadow + Android elevation 6 that read
  // as a glow ring on OLED and made the bottom of the screen look
  // bruised. Matches the rest of the home / clubs cards.
  card: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    position: 'relative',
  },
  // Close button is anchored 10pt inset from the corner so it doesn't
  // crowd the rating chip in the title row. `closeReservedRight` on
  // `titleRowWithClose` pushes the rating left by 36pt — chip width
  // (24×24) + breathing space — so the two never sit at the same x
  // coordinate. The 24×24 hit slot is smaller than the previous 28×28
  // but `hitSlop: 12` keeps the effective tap target at 48×48.
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 15, 22, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#1A1F2B',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  // Add right padding ONLY when the close button is visible. Without
  // this the rating chip sits at exactly the same x-coordinate as the
  // X — the "crammed together" feedback we kept getting. 36pt = close
  // button width (24) + gap (12) so the rating's right edge is
  // visually 12pt clear of the X's left edge.
  titleRowWithClose: {
    paddingRight: 36,
  },
  name: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  openText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11.5,
    color: '#22C55E',
  },
  closedText: {
    color: '#EF4444',
  },
  openDot: {
    color: '#22C55E',
  },
  closedDot: {
    color: '#EF4444',
  },
  // Directions CTA — full-width pill sitting under the row of info.
  // Cyan fill mirrors the polyline colour on the map so users grasp
  // the visual connection at a glance ("the line is the same colour
  // as the button that drew it"). Active state inverts to an outline
  // with cyan text so the difference reads at a glance — same
  // affordance Yandex uses for "Стоп" / "Скрыть".
  directionsBtn: {
    marginTop: 10,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#00CFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  directionsBtnActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00CFFF',
  },
  directionsBtnText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#0B0F16',
  },
  directionsBtnTextActive: {
    color: '#00CFFF',
  },
});
