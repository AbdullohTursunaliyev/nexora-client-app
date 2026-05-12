import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';
import GallerySlider from './GallerySlider';

interface Props {
  images: string[];
}

/**
 * Thumbnail strip for the club-details screen.
 *
 * Shows up to 3 thumbnails. If the gallery has more photos, the 3rd
 * tile renders a "+N" badge so the user knows there's more behind it.
 * Tapping any tile (or the "View all" link) opens a full-screen
 * GallerySlider at the corresponding index.
 *
 * Pre-fix the TouchableOpacity wrappers had no onPress and "View all"
 * was a dead text — the thumbnails were decorative only. The user
 * reported "rasmlar ustiga bossam slider ochilsin" which is exactly
 * the lightbox behaviour wired here.
 */
export default function ClubGallery({ images }: Props) {
  const t = useT();
  // Cap the strip to 3 tiles. The 3rd tile gets a `+N` overlay if the
  // gallery is longer, so the user can still get to every photo.
  const visible = images.slice(0, 3);
  const remainder = Math.max(0, images.length - 3);

  const [sliderOpen, setSliderOpen] = useState(false);
  const [sliderStart, setSliderStart] = useState(0);

  const openAt = (idx: number) => {
    setSliderStart(idx);
    setSliderOpen(true);
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t.clubDetails.galleryTitle}</Text>
        {images.length > 0 && (
          <TouchableOpacity
            hitSlop={8}
            onPress={() => openAt(0)}
            accessibilityRole="button"
            accessibilityLabel={t.clubDetails.galleryViewAll}
          >
            <Text style={styles.action}>{t.clubDetails.galleryViewAll}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.row}>
        {visible.map((uri, idx) => {
          const isLastVisible = idx === visible.length - 1;
          const showMoreOverlay = isLastVisible && remainder > 0;
          return (
            <TouchableOpacity
              key={idx}
              style={styles.thumbWrap}
              activeOpacity={0.85}
              onPress={() => openAt(idx)}
              accessibilityRole="button"
              accessibilityLabel={t.clubDetails.galleryTitle}
            >
              <Image source={{ uri }} style={styles.thumb} />
              {showMoreOverlay && (
                <View style={styles.moreOverlay}>
                  <Text style={styles.moreText}>+{remainder}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <GallerySlider
        visible={sliderOpen}
        images={images}
        initialIndex={sliderStart}
        onClose={() => setSliderOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: Colors.text,
  },
  action: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#00CFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbWrap: {
    flex: 1,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1F2B',
  },
  // Dark overlay + "+N" label rendered on the 3rd tile when there are
  // more than 3 photos. Mirrors a common gallery preview pattern (e.g.
  // Airbnb listings) so the user immediately understands the tile is a
  // shortcut into the full set rather than a 3rd standalone image.
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 15, 22, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.white,
    letterSpacing: 0.5,
  },
});
