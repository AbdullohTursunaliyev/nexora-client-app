import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import StarIcon from '../components/icons/StarIcon';
import SparklesIcon from '../components/icons/SparklesIcon';
import HeartIcon from '../components/icons/HeartIcon';
import MonitorIcon from '../components/icons/MonitorIcon';
import GamepadIcon from '../components/icons/GamepadIcon';
import * as clubsApi from '../lib/api/services/clubs';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import { useT } from '../lib/i18n/LocaleProvider';
import KeyboardSafeView from '../components/common/KeyboardSafeView';

type IconCmp = React.ComponentType<{ size?: number; color?: string }>;

interface RatingRowProps {
  Icon: IconCmp;
  iconColor: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}

function RatingRow({ Icon, iconColor, label, value, onChange }: RatingRowProps) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.labelWrap}>
        <Icon size={16} color={iconColor} />
        <Text style={rowStyles.label}>{label}</Text>
      </View>
      <View style={rowStyles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={4}>
            <StarIcon size={22} color={n <= value ? '#F59E0B' : '#3A4250'} filled={n <= value} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function WriteReviewScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ clubName?: string }>();
  // Header shows the club name when the caller forwarded it (from
  // club-reviews-list, which gets it from club-details). Pre-fix the
  // generic "Yangi sharh yozish" copy made it unclear which club the
  // user was reviewing — a real concern when they have multiple
  // joined clubs.
  const headerTitle = params.clubName?.trim() || t.writeReview.headerTitle;
  const [rating, setRating] = useState(0);
  // Four sub-ratings matching the BE's SaveClubReviewAction contract:
  // atmosphere / cleanliness / technical / peripherals. Pre-fix the
  // form collected three (atmosphere/cleanliness/staff) — `staff` was
  // silently dropped server-side (no such column), and the missing
  // technical + peripherals fell back to the overall rating, so every
  // submitted review had three sub-rating columns set to a copy of
  // the overall number. Audit finding H1.
  const [atmosphere, setAtmosphere] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [technical, setTechnical] = useState(0);
  const [peripherals, setPeripherals] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (rating === 0) {
      toast.error(t.writeReview.errorMissing);
      return;
    }
    setSubmitting(true);
    try {
      // Send all four sub-ratings explicitly. The BE falls back each
      // missing field to the overall `rating`, but we'd rather send
      // the user's actual choices than rely on the BE's silent
      // fallback (which masked the H1 bug for so long). When a
      // sub-rating is left at 0 (user didn't tap it) we omit it so
      // the BE falls back to overall — that preserves the "skip
      // detail, leave only overall" UX while not lying about the
      // user's choices when they DID tap a star.
      await clubsApi.saveClubReview({
        rating,
        atmosphere_rating: atmosphere || undefined,
        cleanliness_rating: cleanliness || undefined,
        technical_rating: technical || undefined,
        peripherals_rating: peripherals || undefined,
        comment: comment.trim() || undefined,
      });
      toast.success(t.writeReview.successToast);
      router.back();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardSafeView>
      <SimpleHeader title={headerTitle} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t.writeReview.rateLabel}</Text>

        <View style={styles.mainRatingCard}>
          <View style={styles.bigStars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={4}>
                <StarIcon size={36} color={n <= rating ? '#F59E0B' : '#3A4250'} filled={n <= rating} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.detailedCard}>
          <RatingRow
            Icon={SparklesIcon}
            iconColor="#F59E0B"
            label={t.writeReview.atmosphereLabel}
            value={atmosphere}
            onChange={setAtmosphere}
          />
          <View style={styles.divider} />
          <RatingRow
            Icon={HeartIcon}
            iconColor="#22C55E"
            label={t.writeReview.cleanlinessLabel}
            value={cleanliness}
            onChange={setCleanliness}
          />
          <View style={styles.divider} />
          <RatingRow
            Icon={MonitorIcon}
            iconColor="#00CFFF"
            label={t.writeReview.technicalLabel}
            value={technical}
            onChange={setTechnical}
          />
          <View style={styles.divider} />
          <RatingRow
            Icon={GamepadIcon}
            iconColor="#A78BFA"
            label={t.writeReview.peripheralsLabel}
            value={peripherals}
            onChange={setPeripherals}
          />
        </View>

        <Text style={styles.sectionTitle}>{t.writeReview.commentLabel}</Text>
        <View style={styles.commentCard}>
          <TextInput
            style={styles.commentInput}
            placeholder={t.writeReview.commentPlaceholder}
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={5}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Submit-review CTA — lg pill anchored to bottom bar with
            spinner-only loading (the call is fast, label flash
            would feel jittery). The form layer drives error toasts
            for missing-overall-rating so disabled state isn't
            needed here. */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={t.writeReview.submitBtn}
          accessibilityState={{ disabled: submitting, busy: submitting }}
          style={[submitBtnStyles.btn, submitting && submitBtnStyles.btnDisabled]}
        >
          <LinearGradient
            colors={['#3B5BF5', '#8B3DF5']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={submitBtnStyles.fill}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={submitBtnStyles.label}>{t.writeReview.submitBtn}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
      </KeyboardSafeView>
    </SafeAreaView>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  labelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: Fonts.inter.medium, fontSize: 13, color: Colors.text },
  stars: { flexDirection: 'row', gap: 4 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  title: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  mainRatingCard: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  bigStars: { flexDirection: 'row', gap: 8 },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  detailedCard: {
    backgroundColor: '#141823',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  commentCard: {
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    minHeight: 120,
  },
  commentInput: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    color: Colors.text,
    minHeight: 100,
    paddingVertical: 0,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
});

// Inline submit-review CTA. 52pt lg pill bound to the bottom bar.
const submitBtnStyles = StyleSheet.create({
  btn: { height: 52, borderRadius: 999, alignSelf: 'stretch', overflow: 'hidden' },
  btnDisabled: { opacity: 0.5 },
  fill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});
