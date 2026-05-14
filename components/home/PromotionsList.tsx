import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { Images } from '../../constants/Images';
import PromotionCard from './PromotionCard';
import SkeletonPromotionCard from './SkeletonPromotionCard';
import type { Promotion as CardPromotion } from '../../lib/data/promotions';
import { listPromotions, type Promotion as ApiPromotion } from '../../lib/api/services/promotions';
import { useT, useLocale } from '../../lib/i18n/LocaleProvider';
import { useAuth } from '../../store/AuthProvider';
import { tokens } from '../../lib/api/client';
import { logWarn } from '../../lib/util/logger';

const MAX_VISIBLE = 5;
const CARD_WIDTH = 280;
const CARD_GAP = 12;

const ACCENT_COLORS = ['#A78BFA', '#22C55E', '#F59E0B', '#00CFFF', '#FF34E0'];

/**
 * Adapt the live `/mobile/promotions` row onto the existing PromotionCard
 * shape so the card itself doesn't have to know about the promo engine.
 *
 *  - image:     rotates through the bundled promo images; once the BE
 *               supports `cover_url` on the promotions table we'll
 *               prefer that.
 *  - accentColor: derived from index — gives variety in a row of cards
 *                 without operators having to pick palette codes.
 *  - discountText: bonus_percent if present ("+10% bonus"), otherwise
 *                  the description verbatim.
 *  - schedule:    formatted "До 12 May" / "12 May – 15 May" so users
 *                 see urgency without reading raw ISO timestamps.
 *
 * Both the bonus suffix ("bonus" / "бонус") and the until-prefix
 * ("Until" / "До") come from translations — pre-fix they were
 * hardcoded English which leaked through to the ru/uz UI.
 */
function adaptPromotion(
  api: ApiPromotion,
  idx: number,
  lang: string,
  t: ReturnType<typeof useT>,
): CardPromotion {
  // Images has a single bundled promo image today; once the BE
  // grows `cover_url` on promotions we'll prefer it. Rotating
  // accent colours give visual variety in the meantime.
  const image = Images.promotion;
  const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length];
  // Prefer the structured bonus_percent (universal across locales) →
  // then the operator's description copy. Only fall back to the title
  // when both are missing AND it's distinct from the title itself,
  // otherwise the card renders the same string twice.
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

interface Props {
  loading?: boolean;
}

export default function PromotionsList({ loading = false }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const { currentTenantId, clubs, switchClub } = useAuth();
  const [apiPromos, setApiPromos] = useState<ApiPromotion[]>([]);
  const [fetching, setFetching] = useState(false);

  // Look up the active club so we can stamp its name onto each
  // PromotionCard. /mobile/promotions returns promotions for the
  // current tenant only — there's no per-promotion `tenant_id` in
  // the response — so we know every row on this carousel belongs to
  // the user's currently-switched club. The chip turns that implicit
  // context into something the user can SEE on the card.
  const activeClubName = useMemo(() => {
    const match = clubs.find((c) => c.tenant_id === currentTenantId);
    return match?.tenant_name ?? clubs[0]?.tenant_name ?? '';
  }, [clubs, currentTenantId]);

  // Pre-fix this effect's deps listed `clubs` directly — every
  // refreshMe() handed AuthProvider a fresh array reference (even
  // when the underlying memberships were identical), and that
  // bumped the effect on every parent render. We collapse the
  // memberships into a stable signature instead so the effect only
  // re-runs when the data ACTUALLY changes (user joins / switches /
  // leaves a club).
  const membershipSig = useMemo(
    () => clubs.map((c) => c.tenant_id).sort().join(','),
    [clubs],
  );
  // Snapshot the first joined tenant id for the auto-heal path —
  // reading `clubs[0]` directly from a callback would close over a
  // stale array on re-renders.
  const firstTenantId = clubs[0]?.tenant_id ?? null;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Defensive self-heal: PromotionsList is tenant-scoped, so it
      // needs a client_token. If we lack either the FE-side tenant id
      // OR the actual stored token (the two can diverge after a
      // partial reset), fire switchClub against the user's first
      // joined club so we never sit on an empty screen for the user.
      let effectiveTenant = currentTenantId;
      const hasClientToken = !!tokens.getClientToken();
      const needsHeal = (!effectiveTenant || !hasClientToken) && firstTenantId != null;

      if (needsHeal && firstTenantId != null) {
        try {
          await switchClub(firstTenantId);
          effectiveTenant = firstTenantId;
        } catch (err) {
          logWarn('[PromotionsList] auto switchClub failed', err);
        }
      }

      if (!effectiveTenant) {
        // User truly has no clubs joined — render the empty-state
        // copy without a fetch.
        if (!cancelled) setApiPromos([]);
        return;
      }

      setFetching(true);
      try {
        const data = await listPromotions();
        if (!cancelled) setApiPromos(data);
      } catch (err) {
        logWarn('[PromotionsList] /promotions fetch failed', err);
        if (!cancelled) setApiPromos([]);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // Deps: currentTenantId (primitive) + membershipSig (stable
    // string) + firstTenantId (primitive) + switchClub (useCallback'd
    // in AuthProvider). All four are referentially stable across
    // renders where the underlying values haven't changed.
  }, [currentTenantId, membershipSig, firstTenantId, switchClub]);

  const PROMOTIONS: CardPromotion[] = useMemo(
    () => apiPromos.map((p, idx) => adaptPromotion(p, idx, locale, t)),
    [apiPromos, locale, t],
  );

  if (loading || (fetching && PROMOTIONS.length === 0)) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        style={styles.scrollOverflow}
        scrollEnabled={false}
      >
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.cardWrap}>
            <SkeletonPromotionCard />
          </View>
        ))}
      </ScrollView>
    );
  }

  /**
   * Empty-state recovery tap. Pre-fix this ALWAYS cleared the stored
   * `client_token` and re-issued switchClub — heavy-handed and
   * unnecessary when the only issue is a transient network blip. We
   * now try the simple refetch first; only fall back to the
   * token-clear-and-switch path when the refetch itself fails. That
   * keeps the happy path cheap while preserving the heal-on-stuck
   * behaviour for the rare 401 → empty case.
   */
  const onReloadEmpty = async () => {
    if (firstTenantId == null) return;
    setFetching(true);
    try {
      try {
        const data = await listPromotions();
        setApiPromos(data);
        return;
      } catch (err) {
        logWarn('[PromotionsList] reload failed, attempting heal', err);
      }
      // Heal path: drop the client_token + re-issue switchClub so the
      // request interceptor gets a fresh one. Last resort because
      // it forces a /auth/switch-club round-trip even when not needed.
      await tokens.setClientToken(null);
      await switchClub(firstTenantId);
      const data = await listPromotions();
      setApiPromos(data);
    } catch (err) {
      logWarn('[PromotionsList] manual reload heal failed', err);
    } finally {
      setFetching(false);
    }
  };

  if (PROMOTIONS.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>🎁</Text>
        </View>
        <View style={styles.emptyBody}>
          <Text style={styles.emptyTitle}>{t.home.promoEmptyTitle}</Text>
          <Text style={styles.emptySub}>{t.home.promoEmptySub}</Text>
          {clubs.length > 0 && (
            <TouchableOpacity
              style={styles.emptyReloadBtn}
              onPress={onReloadEmpty}
              activeOpacity={0.75}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t.home.promoEmptyReload}
              disabled={fetching}
            >
              <Text style={styles.emptyReloadText}>
                {fetching ? '…' : t.home.promoEmptyReload}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const visible = PROMOTIONS.slice(0, MAX_VISIBLE);
  const hasMore = PROMOTIONS.length > MAX_VISIBLE;
  const remaining = PROMOTIONS.length - MAX_VISIBLE;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      decelerationRate="fast"
      snapToInterval={CARD_WIDTH + CARD_GAP}
      snapToAlignment="start"
      style={styles.scrollOverflow}
    >
      {visible.map((promo) => (
        <View key={promo.id} style={styles.cardWrap}>
          <PromotionCard
            promotion={promo}
            clubName={activeClubName}
            // currentTenantId is the canonical "which club do these
            // promos belong to" for this carousel. Tap navigates to
            // that club's details page.
            clubId={currentTenantId ?? undefined}
          />
        </View>
      ))}

      {hasMore && (
        // Pre-fix this routed to `/notifications`, which is the bell-
        // icon destination and shows user-targeted messages — not the
        // BE promotions table the carousel is built on. Routing into
        // the dedicated `/promotions-list` so the inline view-all and
        // the section-header "Vse" link land on the same screen.
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.viewAllCard}
          onPress={() => router.push('/promotions-list')}
          accessibilityRole="button"
          accessibilityLabel={t.home.viewAll}
        >
          <View style={styles.viewAllArrow}>
            <Text style={styles.viewAllArrowText}>→</Text>
          </View>
          <Text style={styles.viewAllTitle}>{t.home.viewAll}</Text>
          <Text style={styles.viewAllSub}>
            {t.home.viewAllRemaining.replace('{n}', String(remaining))}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollOverflow: {
    marginHorizontal: -16,
  },
  scroll: {
    gap: CARD_GAP,
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  cardWrap: {
    width: CARD_WIDTH,
  },
  // Empty-state card sits inside the section so the gap below the
  // header stays consistent with the rest of the screen rhythm.
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#141823',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.18)',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(167, 139, 250, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: { fontSize: 22 },
  emptyBody: { flex: 1, gap: 4 },
  emptyTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    lineHeight: 18,
  },
  // Manual recovery button. We size it generously enough to land a
  // confident tap (hitSlop adds more) but visually slot it under the
  // sub-copy so the card stays a single coherent block, not a chunky
  // CTA card. Cyan tint matches the rest of the empty-state border.
  emptyReloadBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 207, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.35)',
  },
  emptyReloadText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12,
    color: '#00CFFF',
  },
  viewAllCard: {
    width: 160,
    height: 140,
    backgroundColor: '#141823',
    borderRadius: 18,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 207, 255, 0.25)',
    borderStyle: 'dashed',
    gap: 8,
  },
  viewAllArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 207, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllArrowText: {
    fontSize: 22,
    color: '#00CFFF',
    fontFamily: Fonts.inter.bold,
  },
  viewAllTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
    textAlign: 'center',
  },
  viewAllSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
    textAlign: 'center',
  },
});
