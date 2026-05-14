import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';
import NavigationIcon from '../icons/NavigationIcon';

interface Props {
  bottomInset: number;
  onDirection?: () => void;
  /**
   * Optional handler for the "Book" CTA. When provided the parent
   * owns the booking-context check (is the user a member, do we need
   * to switchClub first, etc.) and we just call it on tap. When
   * omitted we fall back to a bare `router.push('/zone-select')` —
   * useful for places where the screen guarantees the active tenant
   * already matches the displayed club.
   *
   * `loading` allows the parent to disable the button while a
   * switchClub round-trip is in flight so the user can't double-tap
   * into a half-switched state.
   */
  onBook?: () => void | Promise<void>;
  bookLoading?: boolean;
  /**
   * Override the primary button label. Used when the user is NOT a
   * member of the displayed club — the parent flips this to
   * "Klubga qo'shilish" so the affordance is obvious from the
   * moment they land on the screen (instead of letting them tap
   * Book and then catching them with a dialog). Defaults to the
   * generic "Bron qilish" translation when omitted.
   */
  bookLabel?: string;
}

/**
 * Sticky bottom bar shown on club detail / preview screens.
 *
 * Layout: a 1:1 split between the secondary "Yo'nalish" outline action
 * and the primary "Bron qilish" filled CTA. Pre-fix this used the
 * shared <Button /> component for both halves with `size="lg"` +
 * `fullWidth`. Inlining both halves below lets each side tune its own
 * shape to its intended role: the outline button reads as a peer
 * action (same 52pt height, same pill radius, cyan border + cyan
 * label), the primary CTA gets the gradient. Equal-flex slots preserve
 * the 50/50 split — visual hierarchy comes from FILL, not from size.
 */
export default function ClubBottomBar({
  bottomInset,
  onDirection,
  onBook,
  bookLoading,
  bookLabel,
}: Props) {
  const t = useT();
  const handleBook = onBook ?? (() => router.push('/zone-select'));
  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 12) }]}>
      {/* Direction — outline secondary. Pill stays at 52pt to match
          the primary CTA's height, but the fill is transparent with
          a cyan border so the visual weight reads as "peer action,
          not the headline CTA". */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onDirection}
        accessibilityRole="button"
        accessibilityLabel={t.clubDetails.direction}
        style={[styles.btnSlot, directionBtnStyles.btn]}
      >
        <NavigationIcon size={16} color="#00CFFF" />
        <Text style={directionBtnStyles.label}>{t.clubDetails.direction}</Text>
      </TouchableOpacity>

      {/* Book CTA — primary gradient. `loading` flips the label out
          for a spinner so the user sees the switchClub round-trip
          progressing. */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleBook}
        disabled={bookLoading}
        accessibilityRole="button"
        accessibilityLabel={bookLabel ?? t.clubDetails.book}
        accessibilityState={{ disabled: !!bookLoading, busy: !!bookLoading }}
        style={[styles.btnSlot, bookBtnStyles.btn, bookLoading && bookBtnStyles.btnDisabled]}
      >
        <LinearGradient
          colors={['#3B5BF5', '#8B3DF5']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={bookBtnStyles.fill}
        >
          {bookLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={bookBtnStyles.label}>{bookLabel ?? t.clubDetails.book}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // No shadow / elevation: the 1pt top border + dark background
  // already separates the sticky bottom bar from the scroll content
  // above it. iOS shadows + Android elevation 12 read as a glow halo
  // on OLED panels.
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  // Equal-flex slot — both inline buttons live inside this wrapper so
  // the 50/50 row split is preserved.
  btnSlot: {
    flex: 1,
  },
});

const directionBtnStyles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 207, 255, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  label: {
    color: '#00CFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});

const bookBtnStyles = StyleSheet.create({
  btn: { height: 52, borderRadius: 999, overflow: 'hidden' },
  btnDisabled: { opacity: 0.6 },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});
