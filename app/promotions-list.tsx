import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Text, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SimpleHeader from '../components/common/SimpleHeader';
import PromotionCard from '../components/home/PromotionCard';
import SkeletonPromotionCard from '../components/home/SkeletonPromotionCard';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { Images } from '../constants/Images';
import { useT, useLocale } from '../lib/i18n/LocaleProvider';
import { useAuth } from '../store/AuthProvider';
import { tokens } from '../lib/api/client';
import {
  listPromotions,
  type Promotion as ApiPromotion,
} from '../lib/api/services/promotions';
import type { Promotion as CardPromotion } from '../lib/data/promotions';
import { logWarn } from '../lib/util/logger';

const ACCENT_COLORS = ['#A78BFA', '#22C55E', '#F59E0B', '#00CFFF', '#FF34E0'];

/**
 * Dedicated "All active promotions" screen.
 *
 * Reached from the home tab via:
 *   1. The "🔥 Aktiv aksiyalar" section header's right-side action link
 *      (`SectionHeader`'s `onAction` → router.push('/promotions-list')).
 *   2. The inline "View all" card at the tail of the home carousel
 *      when more than `MAX_VISIBLE` promotions exist.
 *
 * Why a separate screen and not `/notifications?filter=offers`:
 *   Promotions are BE-managed marketing rows on the `promotions` table
 *   (tenant-side discounts, bonuses, time windows). Notifications are
 *   user-targeted messages with category=`promo`. Different entities,
 *   different shapes — routing "see all" to /notifications confused
 *   the two and showed an empty filter on fresh accounts.
 *
 * Shape adapter: identical to `components/home/PromotionsList.tsx`'s
 * adapter, with the same translation hooks for bonus and until-date
 * labels. Lifting to a shared util is a nice-to-have; leaving it
 * inline keeps each screen self-contained for now.
 */
function adaptPromotion(
  api: ApiPromotion,
  idx: number,
  lang: string,
  t: ReturnType<typeof useT>,
): CardPromotion {
  const image = Images.promotion;
  const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length];
  // Localised bonus + until-date labels. Pre-fix this rendered the
  // English strings "+10% bonus" and "Until 12 May" verbatim on the
  // ru/uz UIs.
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

export default function PromotionsListScreen() {
  const t = useT();
  const { currentTenantId, clubs, switchClub } = useAuth();
  const [apiPromos, setApiPromos] = useState<ApiPromotion[]>([]);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Same active-club lookup as the home carousel — we stamp the
  // current tenant's name on every card so the user sees which club
  // owns the offer even when scanning a long list.
  const activeClubName = useMemo(() => {
    const match = clubs.find((c) => c.tenant_id === currentTenantId);
    return match?.tenant_name ?? clubs[0]?.tenant_name ?? '';
  }, [clubs, currentTenantId]);

  const runFetch = async () => {
    // Defensive self-heal mirroring the home-tab carousel: if we lack a
    // client_token (after a partial reset or because the user landed
    // on this screen via a deep-link before AuthProvider settled), kick
    // a switchClub so the /promotions request has Authorization.
    let effectiveTenant = currentTenantId;
    const hasClientToken = !!tokens.getClientToken();
    const needsHeal = (!effectiveTenant || !hasClientToken) && clubs.length > 0;
    if (needsHeal) {
      try {
        await switchClub(clubs[0].tenant_id);
        effectiveTenant = clubs[0].tenant_id;
      } catch (err) {
        // eslint-disable-next-line no-console
        logWarn('[promotions-list] auto switchClub failed', err);
      }
    }
    if (!effectiveTenant) {
      setApiPromos([]);
      return;
    }
    try {
      const data = await listPromotions();
      setApiPromos(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      logWarn('[promotions-list] /promotions fetch failed', err);
      setApiPromos([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setFetching(true);
      await runFetch();
      if (!cancelled) setFetching(false);
    })();
    return () => {
      cancelled = true;
    };
    // currentTenantId / clubs change triggers a re-fetch via the
    // self-heal path. switchClub is stable per AuthProvider instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenantId, clubs]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await runFetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Use the live locale, not the hardcoded 'uz' (audit MED). The
  // adapter's only locale-sensitive output is the date label —
  // pre-fix ru/en users saw "12 май" with a uz month abbreviation.
  const { locale } = useLocale();
  const promotions: CardPromotion[] = useMemo(
    () => apiPromos.map((p, idx) => adaptPromotion(p, idx, locale, t)),
    [apiPromos, locale, t],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={t.promotionsList.headerTitle} rightVariant="none" />

      {fetching && promotions.length === 0 ? (
        <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={false}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.cardWrap}>
              <SkeletonPromotionCard />
            </View>
          ))}
        </ScrollView>
      ) : promotions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎁</Text>
          <Text style={styles.emptyTitle}>{t.promotionsList.emptyTitle}</Text>
          <Text style={styles.emptySub}>{t.promotionsList.emptySub}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00CFFF"
              colors={['#00CFFF']}
              progressBackgroundColor="#141823"
            />
          }
        >
          {promotions.map((promo) => (
            <View key={promo.id} style={styles.cardWrap}>
              <PromotionCard
                promotion={promo}
                clubName={activeClubName}
                // Tap → club details. Pre-fix tapping a promotion
                // here looped back into /promotions-list (the screen
                // the user is already on) — visually nothing changed.
                clubId={currentTenantId ?? undefined}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 14,
  },
  cardWrap: {
    // Same width as the card itself — ScrollView's contentContainer
    // already provides 16px horizontal padding so each card is
    // edge-to-edge minus the gutter.
  },
  empty: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#141823',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.18)',
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
