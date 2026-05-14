import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import StarIcon from '../icons/StarIcon';
import { MapClub } from '../../lib/data/clubs';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  club: MapClub;
}

/**
 * Home / favourites / clubs-list card for a single venue.
 *
 * Layout philosophy: every visible row is conditional on real data
 * being available. The previous version reserved space for a discount
 * badge whether or not the club had one — clubs without a promotion
 * carried an empty gap at the bottom which looked like a render bug.
 * Now:
 *   - distance / PC count / PS-zone chips: emitted into the subtitle
 *     only when non-zero / truthy. A club with no surveyed distance
 *     simply skips the "0.0 km" bullet.
 *   - bookmark: floats over the image (top-right) so it's always
 *     reachable without needing a dedicated row.
 *   - discount badge: only renders when discount_text is set on the
 *     tenant. No discount → the badge row collapses entirely and the
 *     card shrinks to its natural height.
 */
export default function ClubCard({ club }: Props) {
  const t = useT();
  // Build the subtitle from real catalog signals. Pre-fix this could
  // resolve to an empty string for newly-listed clubs (no PC count
  // configured, no GPS distance because user location not granted,
  // no PS zone) — and the subtitle <Text> was conditionally rendered
  // (`{!!subtitle && ...}`), so cards with no signals were SHORTER
  // than neighbouring cards in the same horizontal carousel. Reported
  // visually as inconsistent row heights between e.g. "Cyberium" (new
  // club, empty subtitle) and "Nexora Arena" (full data).
  //
  // Now we ALWAYS render the subtitle row, falling back to a
  // localised "details coming soon" line when no real signals exist.
  // The line uses the same typography as the populated case so the
  // card body's vertical rhythm stays identical across all rows.
  const realSubtitle = [
    club.distanceKm > 0 ? `${club.distanceKm.toFixed(1)} km` : null,
    club.pcCount > 0 ? `${club.pcCount} PC` : null,
    club.hasPSZone ? t.components.clubPsZones : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const subtitle = realSubtitle || t.components.clubSoonDetails;
  const subtitleIsFallback = !realSubtitle;

  const hasRating = club.rating > 0;
  // Highlight "top rated" by promoting the rating chip — bigger star,
  // gold-tinted background, ratings text. Avoids duplicating the
  // 4.8★ value as both a chip and a separate badge below.
  const isTopRated = club.rating >= 4;

  // Pick a single highlight badge for the body slot. Card heights
  // stay consistent because the row is always rendered.
  //
  // Priority order, strongest signal first:
  //   1. Discount text — explicit marketing copy from the operator
  //   2. 24/7 hours    — useful "always open" signal
  //   3. PS5 zone      — niche, only when there's nothing else
  //   4. Verified      — quiet fallback so no card ever looks empty
  const highlight: { label: string; color: string; bg: string } = (() => {
    if (club.discountText) {
      return {
        label: club.discountText,
        color: '#A78BFA',
        bg: 'rgba(124, 58, 237, 0.18)',
      };
    }
    if (club.open24h) {
      return {
        label: t.components.club24h,
        color: '#00CFFF',
        bg: 'rgba(0, 207, 255, 0.14)',
      };
    }
    if (club.hasPSZone) {
      return {
        label: t.components.clubPsZones,
        color: '#FF34E0',
        bg: 'rgba(255, 52, 224, 0.14)',
      };
    }
    return {
      label: t.components.clubVerified,
      color: '#8B95A8',
      bg: 'rgba(139, 149, 168, 0.14)',
    };
  })();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() =>
        router.push({ pathname: '/club-details', params: { clubId: club.id } })
      }
      accessibilityRole="button"
      accessibilityLabel={
        hasRating
          ? `${club.name}, ${club.rating.toFixed(1)} ★`
          : club.name
      }
    >
      <View style={styles.imageWrapper}>
        <Image source={{ uri: club.image }} style={styles.image} />
        <View style={[styles.openBadge, !club.isOpen && styles.closedBadge]}>
          <View style={[styles.openDot, !club.isOpen && styles.closedDot]} />
          <Text style={[styles.openText, !club.isOpen && styles.closedText]}>
            {club.isOpen ? t.components.clubOpen : t.components.clubClosed}
          </Text>
        </View>
        {/* Bookmark icon removed — favorites are derived from
            joinedClubs, so a save/unsave toggle doesn't map to a
            real BE action. The cover stays clean. When a dedicated
            favorites endpoint ships, restore the bookmark with a
            wired onPress. */}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {club.name}
          </Text>
          {hasRating && (
            <View style={[styles.rating, isTopRated && styles.ratingTop]}>
              <StarIcon size={isTopRated ? 13 : 12} color="#F59E0B" filled />
              <Text style={[styles.ratingText, isTopRated && styles.ratingTextTop]}>
                {club.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Subtitle row is ALWAYS rendered so card heights stay
            uniform across the carousel. Tinted lighter when it's the
            fallback ("details coming soon") to subtly tell the user
            the data is incomplete rather than misleading them that
            the club has 0 PCs / 0 distance / no PS zone. */}
        <Text
          style={[styles.subtitle, subtitleIsFallback && styles.subtitleFallback]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>

        <View style={styles.highlightRow}>
          <View style={[styles.highlightBadge, { backgroundColor: highlight.bg }]}>
            <Text
              style={[styles.highlightText, { color: highlight.color }]}
              numberOfLines={1}
            >
              {highlight.label}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // No shadow / elevation — every other card on the home and clubs-list
  // screens sits on the same `#141823` slab, and the dark background
  // already gives them enough separation. Earlier iterations layered
  // iOS shadow + Android elevation here, which read as a lift halo on
  // OLED devices and made the carousel look uneven against the matte
  // PromotionsList cards next to it.
  card: {
    backgroundColor: '#141823',
    borderRadius: 18,
    overflow: 'hidden',
  },
  imageWrapper: {
    height: 120,
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  openBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    fontSize: 11,
    color: '#22C55E',
  },
  closedText: {
    color: '#EF4444',
  },
  body: {
    padding: 14,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Top-rated (>= 4) gets a gold-tinted pill around the rating chip
  // so good clubs stand out at a glance. Sub-4 ratings stay quietly
  // as just a star + number with no chrome.
  ratingTop: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  ratingTextTop: {
    color: '#F59E0B',
    fontFamily: Fonts.inter.bold,
  },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    // Reserve at least one line of vertical space even when the
    // localised fallback string is unusually short — keeps the
    // total card height consistent across rows in the same carousel.
    minHeight: 17,
  },
  // Lighter / italic-looking tint when the subtitle is the fallback
  // copy ("details coming soon") rather than real catalog data.
  // Hints at the missing-data state without screaming.
  subtitleFallback: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
  // Highlight row is always rendered with a fixed height so cards
  // line up vertically regardless of which feature the badge falls
  // back to. minHeight = badge content height + padding = 28 keeps
  // a clean baseline.
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    minHeight: 28,
  },
  highlightBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: '100%',
  },
  highlightText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11.5,
  },
});
