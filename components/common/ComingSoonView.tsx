import { type ComponentType } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import SimpleHeader from './SimpleHeader';
import { useT } from '../../lib/i18n/LocaleProvider';

interface ComingSoonViewProps {
  /** Top-bar title — same string used when the feature is live. */
  headerTitle: string;
  /** Big heading under the icon. */
  title: string;
  /** One-paragraph description of what the feature will do once live. */
  subtitle: string;
  /** Lucide / app icon to render in the circular halo at the top. */
  Icon: ComponentType<{ size?: number; color?: string }>;
  /**
   * Accent colour for the icon halo. The screen otherwise stays
   * neutral so the message reads as "feature paused" not "broken".
   * Defaults to amber — matches the existing Achievements gating.
   */
  accent?: string;
}

/**
 * Reusable "Coming Soon" screen used to gate features that don't yet
 * have full BE wiring. Pre-launch we ship 12 of these (AI assistant,
 * smart queue, rating, tournaments, etc.) — each preserves its route
 * + nav entry but renders this placeholder instead of the (sometimes
 * half-implemented) original UI.
 *
 * Design language:
 *   • Same header chrome as the live screens (back button, title)
 *   • Centred halo + icon → big "Soon" headline → one-line subtitle
 *   • Small uppercase "coming soon" badge underneath (locale-aware)
 *
 * Why a component rather than 12 copies: when the BE lands the
 * feature, we replace ONE import in the screen file with the real
 * content — no need to delete the placeholder code path or rewrite
 * the header layout.
 */
export default function ComingSoonView({
  headerTitle,
  title,
  subtitle,
  Icon,
  accent = '#F59E0B',
}: ComingSoonViewProps) {
  const t = useT();
  // Compose the halo background + border colours from the accent so
  // each gated screen can keep its own brand colour without us
  // having to author per-feature styles.
  const haloBg = withAlpha(accent, 0.12);
  const haloBorder = withAlpha(accent, 0.35);
  const badgeBg = 'rgba(0, 207, 255, 0.12)';
  const badgeBorder = 'rgba(0, 207, 255, 0.35)';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={headerTitle} />
      <View style={styles.content}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: haloBg, borderColor: haloBorder },
          ]}
        >
          <Icon size={56} color={accent} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: badgeBg, borderColor: badgeBorder },
          ]}
        >
          <Text style={styles.badgeText}>{t.common.comingSoon}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * Append an alpha channel to a #RRGGBB colour string. Returns the
 * input unchanged if it isn't a 6-char hex (e.g. already `rgba(...)`).
 * Used to derive halo backgrounds from the accent prop without
 * shipping a full colour-manipulation library.
 */
function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const a = Math.max(0, Math.min(1, alpha));
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11,
    color: '#00CFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
