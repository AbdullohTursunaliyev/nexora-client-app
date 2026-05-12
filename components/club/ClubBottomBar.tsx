import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useT } from '../../lib/i18n/LocaleProvider';
import NavigationIcon from '../icons/NavigationIcon';
import Button from '../common/Button';

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
 * and the primary "Bron qilish" filled CTA. The earlier version sized
 * Yo'nalish to its content and let Book take the remaining flex, which
 * left the two buttons looking imbalanced (~30/70) and made Yo'nalish
 * read as an icon button rather than a peer action. Equal flex with
 * the same Button component for both keeps the visual rhythm with the
 * rest of the app's bottom-bars (booking flow, tournaments, etc.).
 *
 * Visual hierarchy is preserved through fill, not size: the primary
 * gets the gradient, the secondary keeps the cyan outline.
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
      <View style={styles.btn}>
        <Button
          label={t.clubDetails.direction}
          variant="outline"
          size="lg"
          fullWidth
          icon={<NavigationIcon size={16} color="#00CFFF" />}
          onPress={onDirection}
        />
      </View>

      <View style={styles.btn}>
        <Button
          label={bookLabel ?? t.clubDetails.book}
          variant="primary"
          size="lg"
          fullWidth
          loading={bookLoading}
          onPress={handleBook}
        />
      </View>
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
  // Equal-flex slots so both buttons take exactly half of the row.
  btn: {
    flex: 1,
  },
});
