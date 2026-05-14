import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { Images } from '../constants/Images';
import SimpleHeader from '../components/common/SimpleHeader';
import StarIcon from '../components/icons/StarIcon';
import { LinearGradient } from 'expo-linear-gradient';
import MessageCircleIcon from '../components/icons/MessageCircleIcon';
import { Pencil } from 'lucide-react-native';
import * as clubsApi from '../lib/api/services/clubs';
import type { ClubReview } from '../lib/api/services/clubs';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import { useAuth } from '../store/AuthProvider';

// `client_avatar_url` is BE-supplied per review but not yet typed on
// the `ClubReview` interface. We read it defensively via a cast so an
// avatar URL gets through when present without breaking when absent.
type ReviewWithAvatar = ClubReview & { client_avatar_url?: string | null };

export default function ClubReviewsListScreen() {
  const t = useT();
  const toast = useToast();
  const params = useLocalSearchParams<{ clubId?: string; clubName?: string }>();
  const { currentTenantId } = useAuth();

  // Decide which BE endpoint to hit based on whether the requested
  // club is the user's currently-switched tenant:
  //   • Match → use the client.auth endpoint so we get mine +
  //     can_submit, enabling the "Write review" CTA.
  //   • Mismatch (browsing another club) → use the new public
  //     endpoint added BE-side. The reader has no client_token for
  //     that tenant, so the BE forces can_submit:false / mine:null.
  // Pre-fix the screen ALWAYS called client.auth, so visiting a
  // non-current-tenant club's reviews 401'd or returned the wrong
  // tenant's data. The club-details screen guarded the link to hide
  // the path entirely; now the link is open to all clubs and this
  // screen handles both paths cleanly.
  const requestedClubId = params.clubId ? Number(params.clubId) : null;
  const isOwnTenant =
    requestedClubId != null && currentTenantId === requestedClubId;

  const [reviews, setReviews] = useState<ClubReview[]>([]);
  // canSubmit starts false so the "Write a review" button reads as
  // disabled until the fetch confirms the user actually CAN write.
  // Pre-fix it started `true`, which flashed an enabled button for
  // a few hundred ms before snapping to disabled on the BE response.
  const [canSubmit, setCanSubmit] = useState(false);
  const [nextReviewAt, setNextReviewAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Audit deep #1 fix: the BE returns `{reviews, mine, can_submit,
  // next_review_at}`, NOT a bare array. Pre-fix this set the whole
  // object as `reviews` state and the `reviews.map(...)` call below
  // crashed with "reviews.map is not a function". The service layer
  // now exposes a typed `getClubReviewsResponse()` that we destructure
  // — plus a defence-in-depth fallback that handles a stray bare-array
  // response from an older BE build.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data =
          isOwnTenant
            ? await clubsApi.getClubReviewsResponse()
            : requestedClubId != null
              ? await clubsApi.getPublicClubReviews(requestedClubId)
              : await clubsApi.getClubReviewsResponse();
        if (cancelled) return;
        setReviews(data.reviews);
        setCanSubmit(data.can_submit);
        setNextReviewAt(data.next_review_at);
      } catch (e) {
        if (cancelled) return;
        toast.error(getErrorMessage(e));
        setReviews([]);
        setCanSubmit(false);
        setNextReviewAt(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast, isOwnTenant, requestedClubId]);

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length
      : 0;

  // When the BE blocks a new review (24-hour rule), show how long
  // the user has to wait instead of letting them tap into a 422
  // dead end. Hour-granularity matches the BE's `addDay()` window.
  // Pre-fix this rounded to days so a 23-hour wait read as "1 day
  // away" which felt longer than reality — hours are honest.
  const hoursUntilNextReview = (() => {
    if (canSubmit || !nextReviewAt) return null;
    const ms = Date.parse(nextReviewAt);
    if (!Number.isFinite(ms)) return null;
    return Math.max(1, Math.ceil((ms - Date.now()) / 3_600_000));
  })();

  // Header title prefers the club name (passed via router params from
  // club-details). Falls back to the generic "Reviews" copy if no
  // name was provided — covers deep-link callers that don't know the
  // club name yet. Keeps the screen self-contained.
  const headerTitle = params.clubName?.trim() || t.clubReviewsList.headerTitle;

  // The "Write a review" CTA is only meaningful when the user IS a
  // client of this tenant. For non-members the public endpoint
  // forces can_submit:false anyway, but we ALSO hide the button so
  // the screen reads as read-only at a glance.
  const showWriteBtn = isOwnTenant;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SimpleHeader title={headerTitle} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.avgCard}>
          <Text style={styles.avgValue}>{avg.toFixed(1)}</Text>
          <View style={styles.avgStars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <StarIcon
                key={n}
                size={18}
                color={n <= Math.round(avg) ? '#F59E0B' : '#3A4250'}
                filled={n <= Math.round(avg)}
              />
            ))}
          </View>
          <Text style={styles.avgCount}>
            {t.clubDetails.reviewCount.replace('{n}', String(reviews.length))}
          </Text>
        </View>

        {showWriteBtn && (
          <View style={styles.writeBtnWrap}>
            {/* Write-review CTA — switches between primary (gradient,
                enabled) and disabled (cyan-tinted, with countdown
                label like "{n} soatdan keyin"). Inline so each
                state's exact look is tunable without dragging the
                shared <Button /> variant matrix. */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!canSubmit}
              onPress={() =>
                router.push({
                  pathname: '/write-review',
                  params: {
                    clubName: params.clubName ?? '',
                  },
                })
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              style={writeBtnStyles.btn}
            >
              {canSubmit ? (
                <LinearGradient
                  colors={['#3B5BF5', '#8B3DF5']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={writeBtnStyles.fill}
                >
                  <Pencil size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    style={writeBtnStyles.labelEnabled}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {t.clubReviewsList.writeBtn}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={[writeBtnStyles.fill, writeBtnStyles.fillDisabled]}>
                  <Pencil size={16} color="#0B0F16" strokeWidth={2} />
                  <Text
                    style={writeBtnStyles.labelDisabled}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {hoursUntilNextReview != null
                      ? t.clubReviewsList.writeDisabledIn.replace(
                          '{n}',
                          String(hoursUntilNextReview),
                        )
                      : t.clubReviewsList.writeBtn}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>{t.clubReviewsList.sectionRecent}</Text>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : reviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <MessageCircleIcon size={28} color="#8B95A8" />
            </View>
            <Text style={styles.emptyTitle}>{t.clubReviewsList.sectionRecent}</Text>
            <Text style={styles.emptyText}>{t.writeReview.commentPlaceholder}</Text>
          </View>
        ) : (
          reviews.map((r) => {
            const avatarUrl = (r as ReviewWithAvatar).client_avatar_url ?? Images.avatar;
            return (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image source={{ uri: avatarUrl }} style={styles.reviewAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{r.client_name || `#${r.client_id}`}</Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <StarIcon
                          key={n}
                          size={11}
                          color={n <= Number(r.rating) ? '#F59E0B' : '#3A4250'}
                          filled={n <= Number(r.rating)}
                        />
                      ))}
                      <Text style={styles.reviewDate}>{r.created_at?.slice(0, 10)}</Text>
                    </View>
                  </View>
                </View>

                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}

                {/* Sub-rating pills — surface the four BE-supported
                    columns (atmosphere / cleanliness / technical /
                    peripherals). Pre-fix the third pill rendered
                    `staff_rating` which the BE has never returned
                    (the column doesn't exist on `club_reviews`), so
                    every row's third pill was always hidden via the
                    `!= null` guard. Audit H1 cleanup: replace the
                    dead staff label with the real technical +
                    peripherals fields. Use the dedicated
                    writeReview.{atmosphere,cleanliness,technical,
                    peripherals}Label keys for accurate copy. */}
                {(r.atmosphere_rating ||
                  r.cleanliness_rating ||
                  r.technical_rating ||
                  r.peripherals_rating) && (
                  <View style={styles.subRatings}>
                    {r.atmosphere_rating != null && (
                      <Text style={styles.subRating}>
                        {t.writeReview.atmosphereLabel}: {r.atmosphere_rating}/5
                      </Text>
                    )}
                    {r.cleanliness_rating != null && (
                      <Text style={styles.subRating}>
                        {t.writeReview.cleanlinessLabel}: {r.cleanliness_rating}/5
                      </Text>
                    )}
                    {r.technical_rating != null && (
                      <Text style={styles.subRating}>
                        {t.writeReview.technicalLabel}: {r.technical_rating}/5
                      </Text>
                    )}
                    {r.peripherals_rating != null && (
                      <Text style={styles.subRating}>
                        {t.writeReview.peripheralsLabel}: {r.peripherals_rating}/5
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  avgCard: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  avgValue: { fontFamily: Fonts.inter.bold, fontSize: 36, color: '#F59E0B' },
  avgStars: { flexDirection: 'row', gap: 3 },
  avgCount: { fontFamily: Fonts.inter.regular, fontSize: 11.5, color: '#8B95A8' },
  writeBtnWrap: { marginBottom: 12 },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 149, 168, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontFamily: Fonts.inter.semiBold, fontSize: 15, color: Colors.text, marginTop: 8 },
  emptyText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 18,
  },
  reviewCard: {
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewName: { fontFamily: Fonts.inter.semiBold, fontSize: 13, color: Colors.text },
  reviewStars: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
  reviewDate: {
    fontFamily: Fonts.inter.regular,
    fontSize: 10.5,
    color: '#6B7280',
    marginLeft: 8,
  },
  reviewComment: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: Colors.text,
    lineHeight: 18,
  },
  subRatings: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  subRating: { fontFamily: Fonts.inter.medium, fontSize: 11, color: '#8B95A8' },
});

const writeBtnStyles = StyleSheet.create({
  btn: { height: 52, borderRadius: 999, alignSelf: 'stretch', overflow: 'hidden' },
  fill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
  },
  fillDisabled: { backgroundColor: 'rgba(0, 207, 255, 0.5)' },
  labelEnabled: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
  },
  labelDisabled: {
    color: '#0B0F16',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
  },
});
