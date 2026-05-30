import { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Fonts } from '../../constants/Fonts';
import Seat, { SeatStatus } from './Seat';

interface Props {
  rowLabel: string;
  seats: { id: string; status: SeatStatus }[];
  onSeatPress: (id: string) => void;
}

const SCREEN_PADDING = 32; // 16-pt gutter on each side of the parent scroll
const AISLE = 16;
const INNER_GAP = 8;

/**
 * Seat tile sizing — adapts to how many seats are in the row.
 *
 *   1 seat        → 132 dp  (no aisle; centred, premium feel)
 *   2-3 seats     → 110 dp  (no aisle)
 *   4-5 seats     → 84 dp   (no aisle)
 *   6-7 seats     → 64 dp   (no aisle)
 *   8+ seats      → scales down via formula below, with 5+5 aisle
 *                   split for classic 10-PC clubs.
 *
 * Pre-fix the row was hardcoded 5+5 split with a tile cap of 54 dp.
 * For a tenant with only 1 PC the user saw a single ~30-dp tile
 * floating off-centre — looked like a UI bug, not a bookable seat.
 * Adaptive sizing keeps the row balanced regardless of how many PCs
 * the operator has registered.
 *
 * Tap target is preserved by Seat.tsx's hitSlop, so even the lowest
 * tile width stays > 44 dp (iOS HIG).
 */
const MIN_SEAT = 30;
const AISLE_THRESHOLD = 8;

function pickSeatSize(seatCount: number, availableWidth: number): number {
  if (seatCount <= 0) return MIN_SEAT;

  // Per-bucket max so a 1-PC row looks generous and a 10-PC row
  // doesn't dwarf the screen. Values picked off a Figma mock — the
  // perceived "seat is comfortable to tap" sweet spot.
  const bucketMax =
    seatCount === 1 ? 132 :
    seatCount <= 3 ? 110 :
    seatCount <= 5 ? 84 :
    seatCount <= 7 ? 64 :
    54;

  const totalGaps = (seatCount - 1) * INNER_GAP +
    (seatCount >= AISLE_THRESHOLD ? AISLE : 0);
  const fitWidth = Math.floor((availableWidth - totalGaps) / seatCount);

  return Math.max(MIN_SEAT, Math.min(bucketMax, fitWidth));
}

export default function SeatRow({ rowLabel, seats, onSeatPress }: Props) {
  const { width } = useWindowDimensions();
  const seatCount = seats.length;
  const seatSize = useMemo(
    () => pickSeatSize(seatCount, Math.max(0, width - SCREEN_PADDING)),
    [seatCount, width],
  );

  // Aisle split only kicks in for classic 10-PC rows (or any 8+).
  // Smaller rows render the seats in a single centred line.
  const useAisle = seatCount >= AISLE_THRESHOLD;
  const half = useAisle ? Math.floor(seatCount / 2) : seatCount;
  const firstHalf = useAisle ? seats.slice(0, half) : seats;
  const secondHalf = useAisle ? seats.slice(half) : [];

  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <View style={styles.line} />
        <Text style={styles.rowLabel}>{rowLabel}</Text>
        <View style={styles.line} />
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          {firstHalf.map((s) => (
            <Seat
              key={s.id}
              id={s.id}
              status={s.status}
              size={seatSize}
              onPress={() => onSeatPress(s.id)}
            />
          ))}
        </View>
        {useAisle && <View style={styles.aisle} />}
        {useAisle && (
          <View style={styles.half}>
            {secondHalf.map((s) => (
              <Seat
                key={s.id}
                id={s.id}
                status={s.status}
                size={seatSize}
                onPress={() => onSeatPress(s.id)}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 22,
    gap: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rowLabel: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12.5,
    color: '#8B95A8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  half: {
    flexDirection: 'row',
    gap: INNER_GAP,
  },
  aisle: {
    width: AISLE,
  },
});
