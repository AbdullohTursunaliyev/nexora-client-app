import { useState } from 'react';
import { View, Image, StyleSheet, ImageStyle } from 'react-native';
import { User } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';

interface Props {
  /**
   * Source URL for the user's uploaded avatar. When `null` / `undefined`
   * / `''` we render the bundled-icon fallback instead — never a blank
   * circle. The fallback also kicks in when an attempted remote load
   * errors out (`onError`), so a broken / blocked CDN URL still leaves
   * the user with a visible avatar.
   */
  avatarUrl?: string | null;
  /** Outer diameter in pt. Inner icon scales to ~52% so it doesn't
   *  touch the ring edge. */
  size?: number;
  /**
   * Optional cyan glow ring around the avatar. We pass `false` from
   * places that need a flat avatar (settings list rows) and `true` from
   * the home / profile headers where the avatar is the focal point.
   */
  ring?: boolean;
}

/**
 * Unified avatar with a local bundled fallback.
 *
 * The previous default lived as a `data:image/png` 1×1 transparent
 * PNG inside `constants/Images.ts` — so users without an uploaded
 * picture saw a literal empty circle. UI-avatars.com gave us a
 * fetchable default but the network round-trip meant the slot
 * flashed empty on every cold mount.
 *
 * Here the fallback is a Lucide `<User>` icon rendered directly into
 * a styled `<View>` — no network involvement, no flash, and the same
 * graphic for every user.
 *
 * Centering note (visual bug fix): Lucide's `User` glyph is the
 * head+shoulders silhouette. The bounding box puts the head in the
 * upper half and the shoulders extend wider toward the bottom — so
 * if you center the glyph against its bounding box, the head looks
 * shifted "up and to the left" against the circle's optical center.
 * We compensate by:
 *   - using `flex` centering on the parent so the glyph's box is
 *     centered (mathematically correct)
 *   - bumping the icon size to 56% of the avatar (was 52%) so the
 *     shoulders touch closer to the circle edge — that visually
 *     "fills" the space the eye expects to be balanced
 *   - nudging the icon DOWN 2pt with marginTop so the head sits at
 *     the optical center rather than the geometric center. Small
 *     value but it's the difference between "looks centered" and
 *     "looks slightly off".
 */
export default function UserAvatar({ avatarUrl, size = 38, ring = true }: Props) {
  const [loadFailed, setLoadFailed] = useState(false);
  const hasReal = !!avatarUrl && avatarUrl.length > 0 && !loadFailed;

  const containerSize = ring ? size + 6 : size;
  const innerSize = size;
  // 0.56 (was 0.52): the Lucide User silhouette is narrower than its
  // bounding box suggests because the head is small relative to the
  // shoulder span. Bumping by 4% makes the shoulders fall closer to
  // the circle edge, matching how Material / iOS person glyphs feel.
  const iconSize = Math.round(size * 0.56);
  // Optical-center nudge — see the docblock above. Scales with size
  // so the visual offset stays proportional on a 24pt list avatar
  // and an 88pt edit-profile hero.
  const iconNudgeDown = Math.max(1, Math.round(size * 0.025));

  const containerStyle = ring
    ? [
        styles.ring,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
        },
      ]
    : null;

  const innerStyle: ImageStyle = {
    width: innerSize,
    height: innerSize,
    borderRadius: innerSize / 2,
  };

  const Fallback = (
    <View style={[styles.fallback, innerStyle]}>
      <User
        size={iconSize}
        color="#00CFFF"
        strokeWidth={1.8}
        style={{ marginTop: iconNudgeDown }}
      />
    </View>
  );

  if (!hasReal) {
    return <View style={containerStyle ?? undefined}>{Fallback}</View>;
  }

  return (
    <View style={containerStyle ?? undefined}>
      <Image
        source={{ uri: avatarUrl! }}
        style={[styles.image, innerStyle]}
        onError={() => setLoadFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 1.5,
    borderColor: 'rgba(0, 207, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    backgroundColor: '#141823',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.18)',
    // overflow:hidden so the rounded mask actually clips the icon
    // (prevents 1-px corner artefacts on some Android devices where
    // borderRadius without overflow doesn't fully mask child paint).
    overflow: 'hidden',
  },
  image: {
    backgroundColor: '#1A1F2B',
  },
});

// Suppress unused-Colors warning (Colors token may be needed for future variants).
void Colors;
