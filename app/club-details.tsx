import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import ClubHero from '../components/club/ClubHero';
import ClubInfo from '../components/club/ClubInfo';
import FeatureGrid from '../components/club/FeatureGrid';
import ClubAddress from '../components/club/ClubAddress';
import ClubGallery from '../components/club/ClubGallery';
import ClubPromotions from '../components/club/ClubPromotions';
import ClubBottomBar from '../components/club/ClubBottomBar';
import MembershipBar from '../components/club/MembershipBar';
import ExpandableDescription from '../components/club/ExpandableDescription';
import StarIcon from '../components/icons/StarIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import HomeIcon from '../components/icons/HomeIcon';
import Button from '../components/common/Button';
import { useDiscoverClubs } from '../lib/hooks/useDiscoverClubs';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import { useAuth } from '../store/AuthProvider';
import * as clubsApi from '../lib/api/services/clubs';
import { clearBookingSelections } from '../lib/state/bookingFlow';

type ClubProfile = Awaited<ReturnType<typeof clubsApi.getClubProfile>>;
type ClubPreview = Awaited<ReturnType<typeof clubsApi.previewClub>>;

export default function ClubDetailsScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const toast = useToast();
  const params = useLocalSearchParams<{ clubId?: string; id?: string }>();
  const requestedId = params.clubId ?? params.id;
  const { clubs, loading: clubsLoading } = useDiscoverClubs();
  const { currentTenantId, switchClub } = useAuth();
  const [bookLoading, setBookLoading] = useState(false);
  // Pre-fix this fell back to `clubs[0]` when the requested club wasn't
  // in the discover list — which silently rendered an unrelated club's
  // name / cover / address as if it were the one the user tapped (deep
  // audit P1). The fallback is gone: if `requestedId` is set but no
  // match exists, `baseClub` stays null and the screen shows the
  // notFound state.
  //
  // Edge case: when the discover list is still being fetched, `clubs`
  // is `[]` and the find returns undefined. We detect that via the
  // `clubsLoading` flag and render a spinner instead of the notFound
  // card, which would have flashed for ~200ms on every entrance.
  const baseClub =
    (requestedId && clubs.find((c) => String(c.id) === String(requestedId))) || null;
  const [profile, setProfile] = useState<ClubProfile | null>(null);
  const [preview, setPreview] = useState<ClubPreview | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pre-fix (P1 audit) this always called `getClubProfile()` which
    // returns the *currently-switched* tenant's profile. If the user
    // tapped a different club on the map they saw club A's name/rating
    // overlaid on club B's info — confusing data mashup. The fix:
    // - When the requested club IS the current tenant, use the rich
    //   `/club/profile` endpoint (carries description, phone, hours).
    // - Otherwise use `/club/preview/{tenantId}` which works for any
    //   tenant the user has visibility into and is the right source
    //   for "I'm browsing a club I haven't joined yet."
    setProfile(null);
    setPreview(null);
    const numericId = requestedId ? Number(requestedId) : null;
    if (!numericId || !Number.isFinite(numericId)) return;
    // Both fetches are *enrichment* on top of the discover-side
    // baseClub (name / rating / cover / address are already known).
    // If the BE rejects the call — usually because the user isn't
    // registered as a `client` for that tenant yet ("bu klubda
    // ro'yxatdan o'tmagan") — we silently fall back to the discover
    // baseline. Surfacing a toast here was misleading UX: the user
    // tapped a club from "Other clubs" specifically to browse it
    // before joining, and a "you're not registered" alert reads as
    // an error rather than the expected unjoined state. Genuine
    // server issues (5xx, network down) similarly aren't actionable
    // from this screen — pull-to-refresh on the surfaces inside the
    // screen handles those when they matter.
    if (currentTenantId === numericId) {
      clubsApi
        .getClubProfile()
        .then(setProfile)
        .catch(() => {
          // Quiet — discover baseline carries the user-visible fields.
          setProfile(null);
        });
    } else {
      clubsApi
        .previewClub(numericId)
        .then(setPreview)
        .catch(() => {
          // Quiet — same rationale. Preview is an enrichment; the
          // home/discover row already supplied enough data to render
          // the hero / address / gallery sections.
          setPreview(null);
        });
    }
  }, [requestedId, currentTenantId]);

  // Merge whichever backend payload we managed to load (profile XOR
  // preview) onto the discover-side baseClub. The preview payload is
  // a strict subset of profile, so the projection is uniform.
  const club = baseClub
    ? {
        ...baseClub,
        name: profile?.name ?? preview?.name ?? baseClub.name,
        rating: profile?.rating ?? preview?.rating ?? baseClub.rating,
        reviewCount: profile?.reviews_count ?? baseClub.reviewCount,
        image: profile?.cover_url ?? preview?.cover_url ?? baseClub.image,
        address: profile?.address ?? baseClub.address,
        description: profile?.description ?? preview?.description ?? baseClub.description,
      }
    : baseClub;

  if (!club) {
    // Loading shell: discover hook is still fetching the first page.
    // Without this gate the notFound card flashes on every entrance
    // because `clubs` is `[]` for the first ~200ms.
    if (clubsLoading) {
      return (
        <View style={[styles.root, styles.notFoundCenter]}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={[styles.notFoundSub, { marginTop: 12 }]}>
            {t.clubDetails.loading}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.root, styles.notFoundCenter]}>
        <View style={styles.notFoundIconWrap}>
          <HomeIcon size={32} color="#8B95A8" />
        </View>
        <Text style={styles.notFoundTitle}>{t.clubDetails.notFoundTitle}</Text>
        <Text style={styles.notFoundSub}>{t.clubDetails.notFoundSub}</Text>
        <View style={styles.notFoundBtnWrap}>
          <Button
            label={t.clubDetails.notFoundBtn}
            variant="primary"
            size="md"
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  // Coords are usable for deep-linking only when both numbers are
  // finite AND not the BE's "ungeocoded" 0/0 sentinel. Otherwise a
  // tap would drop a pin in the Atlantic.
  const hasUsableCoords =
    Number.isFinite(club.lat) &&
    Number.isFinite(club.lng) &&
    !(club.lat === 0 && club.lng === 0);

  const onDirection = () => {
    if (!hasUsableCoords) {
      // The bottom-bar "Direction" tap should never silently no-op —
      // tell the user why we can't open maps so they don't keep
      // hammering the button.
      toast.error(t.clubDetails.addressUnknown);
      return;
    }
    const label = encodeURIComponent(club.address || club.name || '');
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${club.lat},${club.lng}`,
      android: `geo:${club.lat},${club.lng}?q=${club.lat},${club.lng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${club.lat},${club.lng}`,
    });
    if (!url) return;
    // Audit MED: surface the underlying error if Linking refuses
    // (no maps app installed on Android / iOS, scheme blocked). The
    // empty `.catch(() => {})` left users tapping with no feedback.
    Linking.openURL(url).catch((e) => toast.error(getErrorMessage(e)));
  };

  /**
   * Smart "Book" handler — fixes the cross-club bug where booking
   * from a non-active-tenant club page used the user's CURRENT
   * tenant's PCs / balance instead of the displayed club's.
   *
   * Decision tree:
   *   1. NOT joined          → /club-join directly (button label
   *                            already says "Klubga qo'shilish",
   *                            no confirm dialog needed — the CTA
   *                            itself is unambiguous).
   *   2. Joined, NOT active  → switchClub(thisClub) → /zone-select
   *   3. Joined and active   → /zone-select directly
   *
   * Also wipes the in-memory booking selections (zone, seat) before
   * navigating — switching tenants means the old picks belong to the
   * wrong club and would silently corrupt the flow.
   */
  const onBook = useCallback(async () => {
    const numericClubId = Number(club.id);
    if (!Number.isFinite(numericClubId)) return;

    // Path 1: user isn't a member yet — go straight to join. The
    // button label is already "Klubga qo'shilish" so there's no
    // ambiguity to disambiguate via a confirmation dialog.
    if (!club.joined) {
      router.push('/club-join');
      return;
    }

    // Path 2 / 3: joined club. Drop stale booking state regardless,
    // then switch tenant if needed.
    clearBookingSelections();

    if (currentTenantId !== numericClubId) {
      setBookLoading(true);
      try {
        toast.info(t.clubDetails.switchingClubToast);
        await switchClub(numericClubId);
      } catch (e) {
        toast.error(getErrorMessage(e));
        setBookLoading(false);
        return;
      } finally {
        setBookLoading(false);
      }
    }

    router.push('/zone-select');
  }, [
    club.id,
    club.joined,
    currentTenantId,
    switchClub,
    toast,
    t,
  ]);

  // When the user isn't a member of the displayed club we flip the
  // primary CTA from "Bron qilish" to "Klubga qo'shilish" so the
  // affordance matches what tapping actually does. This avoids the
  // earlier UX where a member-looking "Book" button would silently
  // route through a confirm dialog explaining "actually you need to
  // join first" — friction without information value.
  const bookCtaLabel = club.joined
    ? t.clubDetails.book
    : t.clubDetails.notJoinedConfirm;

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        <ClubHero
          topInset={insets.top}
          imageUri={club.image}
          isOpen={club.isOpen}
          open24h={club.open24h}
          clubId={club.id}
          clubName={club.name}
          scrollY={scrollY}
        />

        <View style={styles.body}>
          <ClubInfo club={club} />
          {club.joined && club.balance != null && <MembershipBar balance={club.balance} />}

          {/* Section order — industry-standard "venue detail" pattern.
              Cross-referenced against Airbnb, Google Maps, Foursquare,
              TripAdvisor, OpenTable — all converge on:
                cover → title → DESCRIPTION → features → location →
                more photos → offers → reviews.
              Description comes first under the title so users get the
              "what is this place" context right after the cover image
              they tapped from home / discover. Chips then expand the
              description into structured at-a-glance amenities;
              address is the practical decision point; gallery /
              promotions / reviews tail off into deeper detail and
              social proof. Empty descriptions render nothing
              (ExpandableDescription returns null on empty text) so a
              club with no operator-supplied copy doesn't leave a hole
              — chips just slide up against ClubInfo. */}
          <ExpandableDescription text={club.description} />
          <FeatureGrid />
          <ClubAddress
            address={club.address}
            distanceKm={club.distanceKm}
            lat={club.lat}
            lng={club.lng}
          />
          {club.gallery.length > 0 && <ClubGallery images={club.gallery} />}

          {/* Promotions row — gated on `currentTenantId === club.id`
              because the BE's `/mobile/promotions` endpoint returns
              the user's *currently-switched* tenant's promos (no
              tenant_id filter). Showing it from an unjoined / not-
              currently-active club would surface the wrong club's
              offers. When the BE gains a tenant_id param, drop the
              gate and forward it via a prop. */}
          {currentTenantId === Number(club.id) && <ClubPromotions />}

          {/* Reviews link is now shown for ALL clubs — the BE gained
              a public reviews endpoint (GET /mobile/clubs/{id}/reviews)
              so users can browse another tenant's reviews before
              joining. The reviews list screen branches between the
              auth and public endpoints based on currentTenantId.
              When the user is on their own tenant they get the full
              {mine, can_submit} payload + the Write CTA; otherwise
              they get a read-only list. */}
          <TouchableOpacity
            style={styles.reviewLink}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/club-reviews-list',
                params: {
                  clubId: club.id,
                  // Forward the club name so the reviews-list header
                  // shows "Nexora Arena Center" instead of a generic
                  // "Reviews" — confirms which club the user is
                  // looking at without dropping back to club-details.
                  clubName: club.name,
                },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={t.clubDetails.reviewsLink}
          >
            <StarIcon size={16} color="#F59E0B" />
            <Text style={styles.reviewLinkText}>{t.clubDetails.reviewsLink}</Text>
            <View style={styles.reviewCountPill}>
              <Text style={styles.reviewCountPillText}>{club.reviewCount}</Text>
            </View>
            <ChevronRightIcon size={14} color="#8B95A8" />
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      <ClubBottomBar
        bottomInset={insets.bottom}
        onDirection={onDirection}
        onBook={onBook}
        bookLoading={bookLoading}
        bookLabel={bookCtaLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  // paddingBottom comes from the inline override in the JSX so the
  // sticky bottom bar's height + safe-area inset are both accounted
  // for. Static 90 used to clip behind iPhone home indicator + Android
  // gesture-nav handles.
  scroll: {},
  body: { paddingHorizontal: 16 },
  reviewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginTop: 18,
  },
  reviewLinkText: {
    flex: 1,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  reviewCountPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reviewCountPillText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  notFoundCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  notFoundIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 149, 168, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  notFoundBtnWrap: {
    marginTop: 4,
  },
  notFoundTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.text,
  },
  notFoundSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    color: '#8B95A8',
    textAlign: 'center',
    marginBottom: 16,
  },
});
