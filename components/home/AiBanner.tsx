import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';
import RobotIcon from '../icons/RobotIcon';

/**
 * Home-screen AI banner.
 *
 * Pre-launch the AI assistant is soon-gated, so the banner is now a
 * non-tappable marketing card: the "Beta" pill is swapped for a "Soon"
 * pill and the bottom CTA still describes what the feature will do —
 * but tapping nothing happens. We keep the banner visible because it
 * sets user expectations ahead of the launch ("AI is coming") without
 * sending them into the placeholder screen.
 *
 * When the LLM integration ships:
 *   1. Wrap the bottom CTA in a `<TouchableOpacity onPress={() => router.push('/ai-assistant')}>`
 *   2. Swap the "Soon" badge back to "Beta"
 *   3. Restore `t.home.aiAction` (now "Try it") if changed
 */
export default function AiBanner() {
  const t = useT();

  return (
    <View
      style={styles.banner}
      // Marketing banner: not interactive, so we mark it as an
      // `accessibilityRole="summary"` group and expose the title +
      // soon-badge + description as a single label. Pre-fix screen
      // readers stepped through every child Text separately and the
      // "Soon" pill read out of order ahead of the description, so
      // VoiceOver users heard "AI · Soon · Description" jumbled.
      accessibilityRole="summary"
      accessible
      accessibilityLabel={`${t.home.aiTitle} · ${t.soon.badgeShort} · ${t.home.aiDescription}`}
    >
      <View style={styles.iconWrapper}>
        <RobotIcon size={22} color="#00CFFF" />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t.home.aiTitle}</Text>
          {/* "Soon" pill replaces the "Beta" pill while the AI
              screen renders the placeholder. */}
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>{t.soon.badgeShort}</Text>
          </View>
        </View>
        <Text style={styles.description}>{t.home.aiDescription}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    backgroundColor: '#0F1F2E',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.18)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginTop: 18,
    // No glow — banner reads as a marketing card from the border +
    // tint alone, the old cyan shadow doubled as a "halo" against
    // the dark background and made the whole element feel noisy.
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  soonBadge: {
    backgroundColor: 'rgba(0, 207, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.4)',
  },
  soonText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 10,
    color: '#00CFFF',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  description: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    lineHeight: 17,
  },
});
