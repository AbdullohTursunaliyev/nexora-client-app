import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { Images } from '../../constants/Images';
import MonitorIcon from '../icons/MonitorIcon';
import GamepadIcon from '../icons/GamepadIcon';
import WalletIcon from '../icons/WalletIcon';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  width: number;
  height: number;
}

type IconCmp = React.ComponentType<{ size?: number; color?: string }>;

/**
 * Onboarding slide #3 — "Book, top up, play".
 *
 * Editorial redesign — full-bleed hero of a personal gaming setup
 * (RGB keyboard + monitor), with three feature pills overlaid in the
 * bottom block. Each pill carries a Lucide-family icon on a tinted
 * square (cyan/purple/amber per category) — pre-redesign these were
 * 76×50 stock-photo thumbnails per row, which looked like an asset
 * gallery, not a feature breakdown.
 *
 * Per the redesign brief: drop the shape elements (stock-photo
 * thumbnails embedded inside cards). Icons + accent colour are a
 * cleaner abstraction — they read as "feature categories" not "stock
 * photos of features".
 */
export default function OnboardingPage3({ width, height }: Props) {
  const t = useT();

  const FEATURES: { title: string; subtitle: string; Icon: IconCmp; color: string }[] = [
    {
      title: t.onboarding.page3Feat1Title,
      subtitle: t.onboarding.page3Feat1Sub,
      Icon: MonitorIcon,
      color: '#00CFFF',
    },
    {
      title: t.onboarding.page3Feat2Title,
      subtitle: t.onboarding.page3Feat2Sub,
      Icon: GamepadIcon,
      color: '#7C3AED',
    },
    {
      title: t.onboarding.page3Feat3Title,
      subtitle: t.onboarding.page3Feat3Sub,
      Icon: WalletIcon,
      color: '#F59E0B',
    },
  ];

  return (
    <View style={[styles.container, { width, height }]}>
      <ImageBackground
        source={{ uri: Images.onboarding.heroSetup }}
        style={styles.bg}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(11, 15, 22, 0.15)',
            'rgba(11, 15, 22, 0.6)',
            'rgba(11, 15, 22, 0.97)',
          ]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.contentWrap}>
          <Text style={styles.eyebrow}>{t.onboarding.page3Feat3Title}</Text>

          <Text style={styles.title}>
            {t.onboarding.page3TitlePart1}
            <Text style={styles.titleAccent}>
              {t.onboarding.page3TitleAccent1}
            </Text>
            <Text style={styles.titleAccent}>
              {t.onboarding.page3TitleAccent2}
            </Text>
          </Text>

          <Text style={styles.subtitle}>
            {t.onboarding.page3Subtitle.replace(/\n/g, ' ')}
          </Text>

          {/* Feature row — icon + text only, no stock thumbnails. The
              translucent slab + 1pt brand-cyan top border reads as a
              floating glass card over the hero photo, in line with
              the editorial pattern (Apple Music's "Up Next" cards,
              Spotify's onboarding feature lists). */}
          <View style={styles.featuresCard}>
            {FEATURES.map((feat, idx) => (
              <View
                key={feat.title}
                style={[
                  styles.featureRow,
                  idx > 0 && styles.featureRowDivider,
                ]}
              >
                <View
                  style={[
                    styles.featureIcon,
                    { backgroundColor: `${feat.color}1F`, borderColor: `${feat.color}44` },
                  ]}
                >
                  <feat.Icon size={18} color={feat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{feat.title}</Text>
                  <Text style={styles.featureSub}>{feat.subtitle}</Text>
                </View>
              </View>
            ))}
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
    paddingHorizontal: 24,
    paddingBottom: 130,
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
    fontSize: 30,
    color: Colors.text,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  titleAccent: {
    color: '#00CFFF',
  },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 14.5,
    color: 'rgba(255, 255, 255, 0.78)',
    lineHeight: 21,
    marginBottom: 4,
  },
  featuresCard: {
    backgroundColor: 'rgba(20, 24, 35, 0.78)',
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.18)',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  featureRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  featureTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  featureSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
});
