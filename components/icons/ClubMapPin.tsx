import { View, Image, StyleSheet } from 'react-native';

interface Props {
  imageUri: string;
  /**
   * Kept on the props for backwards compatibility — the caller still
   * passes `club.rating`. The pin doesn't read it any more: see the
   * docblock above for why colour-by-rating was removed.
   */
  rating?: number;
  isOpen?: boolean;
  variant?: 'active' | 'open' | 'closed';
}

/**
 * Image-based map marker.
 *
 * Geometry rules of thumb (2026-05-11 refinement #4):
 *   - 30×30 squircle, CONSTANT across active/inactive. Earlier
 *     iterations grew the active variant to 34×34 for visual emphasis,
 *     but react-native-maps captures the marker as a bitmap sized to
 *     the FIRST render's measured view; subsequent re-renders at a
 *     bigger size get clipped on the bottom and right (the user's
 *     screenshot showed this cleanly — only the active pin was
 *     truncated). The fix: never change the outer dimensions. Active
 *     state is signalled by border colour + thickness only, which
 *     happens INSIDE the existing box.
 *   - 6px outer padding on every side of the pin View. Android's
 *     marker bitmap-capture occasionally trims pixels from the right
 *     and bottom — generous transparent padding inside the captured
 *     view gives anti-aliasing somewhere to land without falling off
 *     the bitmap.
 *
 * Status communication is driven by border colour:
 *   - Open clubs: emerald-green border (#22C55E) — universal
 *     "available / live" signal, matches the green dot affordance
 *     users already associate with "online" status across other parts
 *     of the app (avatar online ring, etc.).
 *   - Closed clubs: muted grey border (#8B95A8) + 50% dark overlay
 *     across the image. Two reinforcing signals — dim image and
 *     drained border — so "this club is unavailable" reads clearly
 *     without needing to study the marker.
 *   - Active (tapped) clubs: cyan border (#00CFFF), slightly thicker.
 *     Selection trumps status colour, but the closed-overlay is kept
 *     so a tapped closed club still LOOKS closed.
 *
 * Earlier iterations encoded RATING in the border via a red→green
 * ramp; the user reported that conflicted visually with the open/
 * closed signal (green = good rating got mistaken for "online"). The
 * fix was to drop rating colour entirely — rating belongs in the
 * selected card's `★4.8` chip — and reuse the same green-for-open /
 * grey-for-closed pair the rest of the app already uses for status.
 *
 * Colour rules:
 *   - rating > 0 → rating-coloured border (red → green ramp)
 *   - rating 0 (unknown) → neutral grey border. Stops seeded QA
 *     tenants from all painting red, which the eye reads as "broken".
 *   - active → cyan border, slightly larger square.
 *
 * Map markers on Google Maps Android are bitmap-captured. Network
 * images load asynchronously — the caller must keep
 * `tracksViewChanges` ON or the marker freezes on its empty paint.
 */
const SIZE = 30;
const BORDER = 1.75;
const ACTIVE_BORDER = 2.5;
const TAIL_W = 9;
const TAIL_H = 5;
const SAFE_PADDING = 6;

const OPEN_GREEN = '#22C55E';
const CLOSED_GREY = '#8B95A8';
const ACTIVE_CYAN = '#00CFFF';

export default function ClubMapPin({ imageUri, isOpen = true, variant }: Props) {
  const isActive = variant === 'active';
  const closed = !isOpen || variant === 'closed';

  const borderColor =
    isActive ? ACTIVE_CYAN
    : closed ? CLOSED_GREY
    : OPEN_GREEN;
  const borderWidth = isActive ? ACTIVE_BORDER : BORDER;

  return (
    <View style={styles.pin}>
      <View
        style={[
          styles.squircle,
          {
            borderWidth,
            borderColor,
          },
        ]}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        {closed && <View style={styles.closedOverlay} pointerEvents="none" />}
      </View>
      <View style={[styles.tail, { borderTopColor: borderColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // SAFE_PADDING on every side gives the Android marker bitmap capture
  // room to land anti-aliased edges without trimming the right or
  // bottom of the squircle / tail.
  pin: {
    alignItems: 'center',
    paddingHorizontal: SAFE_PADDING,
    paddingTop: SAFE_PADDING,
    paddingBottom: SAFE_PADDING,
  },
  squircle: {
    width: SIZE,
    height: SIZE,
    borderRadius: 9,
    backgroundColor: '#0B0F16',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: '#1A1F2B',
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 22, 0.5)',
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: TAIL_W / 2,
    borderRightWidth: TAIL_W / 2,
    borderTopWidth: TAIL_H,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

export const PIN_WIDTH = SIZE + SAFE_PADDING * 2;
export const PIN_HEIGHT = SIZE + TAIL_H + SAFE_PADDING * 2;
