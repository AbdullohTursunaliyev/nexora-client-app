import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { Images } from '../../constants/Images';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  width: number;
  height: number;
}

export default function OnboardingPage3({ width, height }: Props) {
  const t = useT();

  const FEATURES = [
    {
      title: t.onboarding.page3Feat1Title,
      subtitle: t.onboarding.page3Feat1Sub,
      image: Images.onboarding.computer,
    },
    {
      title: t.onboarding.page3Feat2Title,
      subtitle: t.onboarding.page3Feat2Sub,
      image: Images.onboarding.controller,
    },
    {
      title: t.onboarding.page3Feat3Title,
      subtitle: t.onboarding.page3Feat3Sub,
      image: Images.onboarding.wallet,
    },
  ];

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>
          {t.onboarding.page3TitlePart1}
          <Text style={styles.titleAccent}>{t.onboarding.page3TitleAccent1}</Text>
          <Text style={styles.titleAccent}>{t.onboarding.page3TitleAccent2}</Text>
        </Text>
        <Text style={styles.subtitle}>{t.onboarding.page3Subtitle}</Text>
      </View>

      <View style={styles.cardList}>
        {FEATURES.map((feat) => (
          <View key={feat.title} style={styles.card}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{feat.title}</Text>
              <Text style={styles.cardSubtitle}>{feat.subtitle}</Text>
            </View>
            <View style={styles.cardImageWrap}>
              <Image source={{ uri: feat.image }} style={styles.cardImage} />
            </View>
          </View>
        ))}
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
    fontSize: 14,
    lineHeight: 21,
    color: '#8B95A8',
  },
  cardList: {
    marginTop: 28,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    color: Colors.text,
  },
  cardSubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
  },
  cardImageWrap: {
    width: 76,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1A1F2B',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
});
