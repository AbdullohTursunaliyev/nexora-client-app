import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import ClockIcon from '../icons/ClockIcon';
import LocationPinIcon from '../icons/LocationPinIcon';
import { Promotion } from '../../lib/data/promotions';

interface Props {
  promotion: Promotion;
  /**
   * Name of the club whose tenant owns this promotion. Rendered as a
   * small chip on the cover so the user immediately knows which venue
   * the offer belongs to — pre-fix the home carousel showed promos
   * with zero club context and felt like generic ads. When the user
   * has multiple joined clubs, this disambiguates which one is
   * currently active. Omit when the parent already provides club
   * context (e.g. the club-details "Aksiyalar" section, where every
   * card on the page is by definition for THIS club).
   */
  clubName?: string;
  /**
   * Tenant id of the club this promotion belongs to. When provided AND
   * no explicit `onPress` is passed, tapping the card navigates the
   * user to `/club-details?clubId={clubId}` — the explicit UX choice
   * the user asked for: "promotion tap shows me the club, not just
   * another list of promotions".
   *
   * Falls back through onPress > clubId > /promotions-list so callers
   * that don't know the tenant id (rare) still have a working tap.
   */
  clubId?: string | number;
  /**
   * Optional tap handler. Wins over `clubId` when provided. The
   * club-details "Aksiyalar" row passes `() => {}` to disable
   * navigation entirely — the user is ALREADY on the club page so
   * tapping a promotion there shouldn't bounce them out and back in.
   *
   * Pre-fix the TouchableOpacity had no onPress, so taps were silently
   * absorbed and the card felt like a broken control.
   */
  onPress?: () => void;
}

export default function PromotionCard({ promotion, clubName, clubId, onPress }: Props) {
  const handlePress =
    onPress ??
    (clubId != null
      ? () =>
          router.push({
            pathname: '/club-details',
            params: { clubId: String(clubId) },
          })
      : () => router.push('/promotions-list'));

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        clubName
          ? `${promotion.title} · ${clubName}`
          : promotion.title
      }
      accessibilityHint={promotion.discountText || undefined}
    >
      <ImageBackground
        source={{ uri: promotion.image }}
        style={styles.imageBg}
        imageStyle={styles.imageStyle}
      >
        <LinearGradient
          colors={['transparent', 'rgba(11, 15, 22, 0.65)', '#0B0F16']}
          style={styles.overlay}
        />

        {/* Club chip — top-left on the cover. Glassy dark background +
            pin icon mirrors the open/closed chip we use on ClubCard,
            keeping a consistent "metadata on cover" visual language
            across home surfaces. Truncates after 1 line so a long
            club name doesn't push the discount/title content. */}
        {!!clubName && (
          <View style={styles.clubChip}>
            <LocationPinIcon size={11} color="#00CFFF" />
            <Text style={styles.clubChipText} numberOfLines={1}>
              {clubName}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {promotion.title}
          </Text>
          {!!promotion.discountText && (
            <Text
              style={[styles.discount, { color: promotion.accentColor }]}
              numberOfLines={1}
            >
              {promotion.discountText}
            </Text>
          )}
          {!!promotion.schedule && (
            <View style={styles.timeRow}>
              <ClockIcon size={11} color="#8B95A8" />
              <Text style={styles.timeText} numberOfLines={1}>
                {promotion.schedule}
              </Text>
            </View>
          )}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // No iOS shadow / Android elevation — the gradient overlay and dark
  // background already provide enough lift on the home carousel. Earlier
  // versions stacked a 30%-opacity black shadow + Android elevation 4
  // that read as a glow halo on OLED panels and made the cards look
  // detached from the section above. Matches the rest of the home
  // surfaces which all sit flat on `#0B0F16`.
  card: {
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1A1F2B',
    position: 'relative',
  },
  imageBg: {
    flex: 1,
  },
  imageStyle: {
    borderRadius: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  clubChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: '70%',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.25)',
  },
  clubChipText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  content: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    gap: 4,
  },
  title: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  discount: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  timeText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
});
