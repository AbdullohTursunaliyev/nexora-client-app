import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { Images } from '../../constants/Images';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  width: number;
  height: number;
}

/**
 * Onboarding slide #1 — brand intro / hero.
 *
 * Editorial redesign (post-feedback "professional real work"):
 *   - Full-bleed Full HD photography fills the entire viewport.
 *   - A two-stop LinearGradient (transparent top → 95% dark bottom)
 *     keeps the photo legible without painting a flat slab over it.
 *   - Content sits in the lower third — same convention as Apple
 *     Music / Netflix / Spotify onboarding hero slides.
 *
 * Pre-redesign this page carried a stack of decorative shapes:
 *   - A 130pt NexoraLogo SVG, a separate "NEXORA" wordmark, a "CLOUD"
 *     sublabel, a glow ring behind the logo, and a centred two-line
 *     tagline.
 *   - 50% opacity on the background image made the hero photo feel
 *     washed out, like a watermark.
 *   - The footer carried two more brand tag lines stacked.
 * The user asked to drop "the shape elements you generated" — every
 * one of those decorations is gone now. Just the photo, the wordmark,
 * one tagline, one micro-strap line.
 */
export default function OnboardingPage1({ width, height }: Props) {
  const t = useT();
  return (
    <View style={[styles.container, { width, height }]}>
      <ImageBackground
        source={{ uri: Images.onboarding.heroArena }}
        style={styles.bg}
        // Pre-redesign the image style set `opacity: 0.5`, washing out
        // the hero photo. Full opacity now — the gradient overlay
        // handles legibility, the photo stays as the visual anchor.
        resizeMode="cover"
      >
        {/* Three-stop gradient — transparent top to deep-dark bottom.
            Keeps the upper portion of the image visible while
            guaranteeing the headline + tagline read crisp white. */}
        <LinearGradient
          colors={[
            'rgba(11, 15, 22, 0.15)',
            'rgba(11, 15, 22, 0.55)',
            'rgba(11, 15, 22, 0.96)',
          ]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Content sits in the lower third, anchored to the bottom of
            the viewport with breathing room above the bottom-bar dots
            and CTA the parent renders. */}
        <View style={styles.contentWrap}>
          <Text style={styles.eyebrow}>{t.onboarding.page1Footer1}</Text>

          <Text style={styles.brand}>NEXORA</Text>

          <View style={styles.taglineBlock}>
            <Text style={styles.tagline}>
              {t.onboarding.page1Tagline1}
            </Text>
            <Text style={styles.taglineSecondary}>
              {t.onboarding.page1Tagline2}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
  },
  bg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contentWrap: {
    // Bottom-anchored editorial block — generous side padding mirrors
    // production-app onboarding (Apple Music, Spotify, Revolut) which
    // give the hero copy ~28pt breathing room on each side.
    paddingHorizontal: 28,
    paddingBottom: 150,
    gap: 14,
  },
  eyebrow: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12,
    color: '#00CFFF',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  brand: {
    fontFamily: Fonts.orbitron.black,
    fontSize: 48,
    color: Colors.text,
    letterSpacing: 4,
    lineHeight: 54,
  },
  taglineBlock: {
    gap: 4,
    marginTop: 4,
  },
  tagline: {
    fontFamily: Fonts.inter.bold,
    fontSize: 20,
    color: Colors.text,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  taglineSecondary: {
    fontFamily: Fonts.inter.regular,
    fontSize: 14.5,
    color: 'rgba(255, 255, 255, 0.78)',
    lineHeight: 21,
  },
});
