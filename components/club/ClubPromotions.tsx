import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import PromotionCard from '../home/PromotionCard';
import SkeletonPromotionCard from '../home/SkeletonPromotionCard';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { Images } from '../../constants/Images';
import { useT, useLocale } from '../../lib/i18n/LocaleProvider';
import {
  listPromotions,
  type Promotion as ApiPromotion,
} from '../../lib/api/services/promotions';
import type { Promotion as CardPromotion } from '../../lib/data/promotions';

const ACCENT_COLORS = ['#A78BFA', '#22C55E', '#F59E0B', '#00CFFF', '#FF34E0'];
const CARD_WIDTH = 280;
const CARD_GAP = 12;

/**
 * Klub aksiyalari row for the club-details screen.
 *
 * Only mounted when the user is currently switched into the same
 * tenant as the club they're viewing — the BE's `/mobile/promotions`
 * endpoint returns "current tenant's promotions" with no
 * `tenant_id` filter, so we can't legitimately fetch another
 * tenant's promos from this screen yet. When the BE grows a
 * `tenant_id` param, drop the gate in `club-details.tsx` and pass
 * the target id through this component.
 *
 * The cards themselves omit the club-name chip — every card on
 * this row is by definition for the same club, so repeating the
 * name on every card would be visual noise.
 */
function adaptPromotion(
  api: ApiPromotion,
  idx: number,
  lang: string,
  t: ReturnType<typeof useT>,
): CardPromotion {
  const image = Images.promotion;
  const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length];
  const discountText =
    api.bonus_percent != null && api.bonus_percent > 0
      ? t.home.promoBonusPercent.replace('{n}', String(api.bonus_percent))
      : api.description && api.description !== api.title
        ? api.description
        : '';

  const fmt = (iso?: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      if (!Number.isFinite(d.getTime())) return null;
      return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return null;
    }
  };
  const starts = fmt(api.starts_at);
  const ends = fmt(api.ends_at);
  const schedule = ends
    ? starts
      ? `${starts} – ${ends}`
      : t.home.promoUntil.replace('{date}', ends)
    : starts ?? '';

  return {
    id: api.id,
    title: api.title,
    image,
    accentColor,
    discountText,
    schedule,
  };
}

export default function ClubPromotions() {
  const t = useT();
  const { locale } = useLocale();
  const [apiPromos, setApiPromos] = useState<ApiPromotion[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listPromotions();
        if (!cancelled) setApiPromos(data);
      } catch {
        // Silent — the section just renders the empty-state copy. We
        // don't surface a toast because the rest of the club-details
        // screen is still useful even if this single fetch failed.
        if (!cancelled) setApiPromos([]);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const promotions: CardPromotion[] = useMemo(
    () => apiPromos.map((p, idx) => adaptPromotion(p, idx, locale, t)),
    [apiPromos, locale, t],
  );

  // Loading skeleton — short row of three placeholders, matching the
  // home tab's carousel rhythm.
  if (fetching) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.clubDetails.promotionsTitle}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollOverflow}
          scrollEnabled={false}
        >
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.cardWrap}>
              <SkeletonPromotionCard />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Empty state — gracefully omit the whole section when there's
  // nothing to show. Pre-fix we'd render a sad empty card; the user
  // browsing a club doesn't need a "no promotions" placeholder
  // alongside the address / gallery / reviews — better to keep the
  // screen rhythm tight.
  if (promotions.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t.clubDetails.promotionsTitle}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollOverflow}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
      >
        {promotions.map((promo) => (
          <View key={promo.id} style={styles.cardWrap}>
            {/* `clubName` intentionally omitted — every card in this
                section is for the same club the user is already
                looking at. `onPress={() => {}}` disables the default
                tap-to-club navigation: bouncing the user from
                /club-details/X to /club-details/X is a no-op
                visually but resets scroll position and reads as a
                broken tap. */}
            <PromotionCard promotion={promo} onPress={() => {}} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 22,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: Colors.text,
  },
  // Negative horizontal margin balances the parent `body` padding so
  // the carousel scrolls edge-to-edge. The inner `paddingHorizontal`
  // adds the gutter back as scroll content padding so the first card
  // still respects the 16pt screen margin.
  scrollOverflow: {
    marginHorizontal: -16,
  },
  scrollContent: {
    gap: CARD_GAP,
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  cardWrap: {
    width: CARD_WIDTH,
  },
});
