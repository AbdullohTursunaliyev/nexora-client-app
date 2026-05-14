import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Star } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import StarIcon from '../components/icons/StarIcon';
import HomeIcon from '../components/icons/HomeIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import * as clubsApi from '../lib/api/services/clubs';
import type { MyReview } from '../lib/api/services/clubs';

/**
 * /my-reviews — cross-tenant list of every review the user has
 * authored, across every club they're a Client of.
 *
 * Pre-fix the profile menu "Sharhlar" entry pointed at
 * `/club-reviews-list` with NO clubId, which silently fell through
 * to the current-tenant feed — strangers' reviews of the user's
 * active club. Users expected to see THEIR own writeups; the new
 * screen + BE endpoint (`GET /mobile/auth/reviews`) actually
 * delivers that.
 *
 * Layout choices:
 *   - One card per review, club name + cover thumbnail on top.
 *   - Rating bar shows the overall 1-5 stars; expanded
 *     sub-ratings (atmosphere / cleanliness / etc.) shown as
 *     compact pills when present.
 *   - Tap a card → opens the per-tenant reviews screen for that
 *     club (so user can see how their review sits against others).
 *   - Empty state nudges the user to write their first review.
 */
export default function MyReviewsScreen() {
  const t = useT();
  const toast = useToast();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await clubsApi.getMyReviews();
      setReviews(data);
    } catch (e) {
      toast.error(getErrorMessage(e));
      setReviews([]);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SimpleHeader title={t.myReviews.headerTitle} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
        ) : reviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Star size={28} color="#F59E0B" strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>{t.myReviews.emptyTitle}</Text>
            <Text style={styles.emptyText}>{t.myReviews.emptySub}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.countLabel}>
              {t.myReviews.countLabel.replace('{n}', String(reviews.length))}
            </Text>
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} labels={t} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReviewCard({
  review,
  labels,
}: {
  review: MyReview;
  labels: ReturnType<typeof useT>;
}) {
  // Per-row image fallback flag — broken cover URL or null falls
  // back to a tinted Home icon tile so the row layout doesn't
  // shift when load fails.
  const [coverBroken, setCoverBroken] = useState(false);
  const showCover = !!review.tenant.cover_url && !coverBroken;

  // Sub-rating chips — only shown when the BE actually carries a
  // value (null = user picked overall stars only on submit, didn't
  // expand the detail section).
  const subRatings: { label: string; value: number }[] = [];
  if (review.atmosphere_rating != null) {
    subRatings.push({ label: labels.writeReview.rate4, value: review.atmosphere_rating });
  }
  if (review.cleanliness_rating != null) {
    subRatings.push({ label: labels.writeReview.rate5, value: review.cleanliness_rating });
  }
  if (review.technical_rating != null) {
    subRatings.push({ label: labels.myReviews.technicalLabel, value: review.technical_rating });
  }
  if (review.peripherals_rating != null) {
    subRatings.push({ label: labels.myReviews.peripheralsLabel, value: review.peripherals_rating });
  }

  return (
    <TouchableOpacity
      style={styles.reviewCard}
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: '/club-reviews-list',
          params: {
            clubId: String(review.tenant.id),
            clubName: review.tenant.name,
          },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={review.tenant.name}
    >
      <View style={styles.reviewHeader}>
        {showCover ? (
          <Image
            source={{ uri: review.tenant.cover_url ?? undefined }}
            style={styles.coverThumb}
            onError={() => setCoverBroken(true)}
          />
        ) : (
          <View style={[styles.coverThumb, styles.coverThumbFallback]}>
            <HomeIcon size={20} color="#00CFFF" />
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.tenantName} numberOfLines={1}>
            {review.tenant.name || labels.myReviews.unknownClub}
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <StarIcon
                key={n}
                size={12}
                color={n <= review.rating ? '#F59E0B' : '#3A4250'}
                filled={n <= review.rating}
              />
            ))}
            <Text style={styles.dateText}>
              {(review.updated_at || review.created_at).slice(0, 10)}
            </Text>
          </View>
        </View>
      </View>

      {!!review.comment && (
        <Text style={styles.commentText}>{review.comment}</Text>
      )}

      {subRatings.length > 0 && (
        <View style={styles.subRatingsRow}>
          {subRatings.map((s) => (
            <View key={s.label} style={styles.subRatingPill}>
              <Text style={styles.subRatingLabel}>{s.label}</Text>
              <Text style={styles.subRatingValue}>{s.value}/5</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  countLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    marginTop: 8,
    marginBottom: 12,
  },
  emptyCard: {
    flex: 1,
    backgroundColor: '#141823',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 19,
  },
  reviewCard: {
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coverThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  coverThumbFallback: {
    backgroundColor: '#1F2533',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  tenantName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dateText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 8,
  },
  commentText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
  },
  subRatingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.18)',
  },
  subRatingLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 10.5,
    color: '#8B95A8',
  },
  subRatingValue: {
    fontFamily: Fonts.inter.bold,
    fontSize: 10.5,
    color: '#00CFFF',
  },
});
