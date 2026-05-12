import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import TrophyIcon from '../components/icons/TrophyIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Achievements / rewards screen — gated as "coming soon".
 *
 * Pre-fix (FE audit HIGH) this screen rendered hardcoded fixtures:
 * "LVL 24", "12 450 XP", 6 fake badges, "Season 5 - 85/100", etc.
 * Every user saw identical numbers regardless of their real activity.
 * Per the rewards-center project memo the achievements + store
 * features are not yet built end-to-end (BE endpoints missing), so we
 * gate the whole screen behind a coming-soon placeholder instead of
 * shipping the fake numbers to production.
 *
 * When the real rewards backend lands this component is replaced with
 * the data-driven version (badges + collected + stats tabs) — the
 * route + nav entry stay the same so links from elsewhere in the app
 * don't break.
 */
export default function AchievementsScreen() {
  const t = useT();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={t.achievements.headerTitle} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <TrophyIcon size={56} color="#F59E0B" />
        </View>
        <Text style={styles.title}>{t.achievements.soonTitle}</Text>
        <Text style={styles.subtitle}>{t.achievements.soonSubtitle}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t.achievements.soonBadge}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  title: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 20,
  },
  badge: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.35)',
  },
  badgeText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11,
    color: '#00CFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
