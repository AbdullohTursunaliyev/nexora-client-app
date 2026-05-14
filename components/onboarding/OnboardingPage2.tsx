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
 * Onboarding slide #2 — "Find the best clubs near you".
 *
 * Editorial redesign mirrors page 1 — full-bleed hero photography
 * with a dark gradient overlay anchoring the copy to the lower
 * portion of the screen.
 *
 * Pre-redesign this page was a half-text / half-illustration split
 * with a stack of decorative shape elements wrapping a 220×220
 * building thumbnail:
 *   - 320pt glow circle behind the card
 *   - Floating LocationPinIcon overlaid on top
 *   - A "NEXORA" brand-label badge floating at the bottom of the card
 *   - The text block lived in the top 40% of the screen
 * The user asked to drop those shapes — they're gone. The photo IS
 * the visual now.
 */
export default function OnboardingPage2({ width, height }: Props) {
  const t = useT();
  return (
    <View style={[styles.container, { width, height }]}>
      <ImageBackground
        source={{ uri: Images.onboarding.heroClub }}
        style={styles.bg}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(11, 15, 22, 0.15)',
            'rgba(11, 15, 22, 0.55)',
            'rgba(11, 15, 22, 0.96)',
          ]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.contentWrap}>
          <Text style={styles.eyebrow}>{t.onboarding.page3Feat1Title}</Text>

          <Text style={styles.title}>
            {t.onboarding.page2TitlePart1}
            <Text style={styles.titleAccent}>{t.onboarding.page2TitleAccent}</Text>
            {t.onboarding.page2TitlePart2}
          </Text>

          <Text style={styles.subtitle}>
            {t.onboarding.page2Subtitle.replace(/\n/g, ' ')}
          </Text>
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
    paddingHorizontal: 28,
    paddingBottom: 150,
    gap: 12,
  },
  eyebrow: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12,
    color: '#00CFFF',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Fonts.inter.bold,
    fontSize: 32,
    color: Colors.text,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  titleAccent: {
    color: '#00CFFF',
  },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 15.5,
    color: 'rgba(255, 255, 255, 0.78)',
    lineHeight: 23,
  },
});
