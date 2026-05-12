import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { Images } from '../../constants/Images';
import NexoraLogo from '../icons/NexoraLogo';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  width: number;
  height: number;
}

export default function OnboardingPage1({ width, height }: Props) {
  const t = useT();
  return (
    <View style={[styles.container, { width, height }]}>
      <ImageBackground
        source={{ uri: Images.onboarding.cyberCity }}
        style={styles.bg}
        imageStyle={styles.bgImg}
      >
        <LinearGradient
          colors={['rgba(11,15,22,0.7)', 'rgba(11,15,22,0.85)', '#0B0F16']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.center}>
          <NexoraLogo size={130} />
          <Text style={styles.brand}>NEXORA</Text>
          <Text style={styles.cloud}>CLOUD</Text>

          <View style={styles.taglineWrap}>
            <Text style={styles.taglineCyan}>{t.onboarding.page1Tagline1}</Text>
            <Text style={styles.taglineWhite}>{t.onboarding.page1Tagline2}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t.onboarding.page1Footer1}</Text>
          <Text style={styles.footerText}>{t.onboarding.page1Footer2}</Text>
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
  },
  bgImg: {
    opacity: 0.5,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  brand: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 36,
    color: Colors.text,
    letterSpacing: 6,
    marginTop: 8,
  },
  cloud: {
    fontFamily: Fonts.inter.medium,
    fontSize: 14,
    color: '#8B95A8',
    letterSpacing: 8,
    marginTop: 2,
  },
  taglineWrap: {
    alignItems: 'center',
    marginTop: 36,
    gap: 4,
  },
  taglineCyan: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    color: '#00CFFF',
  },
  taglineWhite: {
    fontFamily: Fonts.inter.medium,
    fontSize: 14,
    color: Colors.text,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 90,
    gap: 4,
  },
  footerText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
  },
});
