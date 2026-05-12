import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { Images } from '../../constants/Images';
import LocationPinIcon from '../icons/LocationPinIcon';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  width: number;
  height: number;
}

export default function OnboardingPage2({ width, height }: Props) {
  const t = useT();
  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>
          {t.onboarding.page2TitlePart1}
          <Text style={styles.titleAccent}>{t.onboarding.page2TitleAccent}</Text>
          {t.onboarding.page2TitlePart2}
        </Text>
        <Text style={styles.subtitle}>{t.onboarding.page2Subtitle}</Text>
      </View>

      <View style={styles.illustrationWrap}>
        <View style={styles.glowWrap}>
          <LinearGradient
            colors={['rgba(124, 58, 237, 0.4)', 'rgba(0, 207, 255, 0.2)', 'transparent']}
            style={styles.glow}
          />
        </View>
        <View style={styles.buildingCard}>
          <Image source={{ uri: Images.onboarding.building }} style={styles.buildingImage} />
          <LinearGradient
            colors={['rgba(11,15,22,0.3)', 'rgba(11,15,22,0.85)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.pinFloat}>
            <LocationPinIcon size={36} color="#7C3AED" />
          </View>
          <View style={styles.brandLabel}>
            <Text style={styles.brandLabelText}>NEXORA</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  textWrap: {
    gap: 14,
  },
  title: {
    fontFamily: Fonts.inter.bold,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  titleAccent: {
    color: '#00CFFF',
  },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 14.5,
    lineHeight: 22,
    color: '#8B95A8',
  },
  illustrationWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  glowWrap: {
    position: 'absolute',
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  buildingCard: {
    width: 220,
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1A1F2B',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  buildingImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  pinFloat: {
    position: 'absolute',
    top: 20,
    left: '50%',
    marginLeft: -18,
  },
  brandLabel: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  brandLabelText: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 18,
    color: '#00CFFF',
    letterSpacing: 4,
  },
});
