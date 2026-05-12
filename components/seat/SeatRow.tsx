import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Fonts } from '../../constants/Fonts';
import Seat, { SeatStatus } from './Seat';

interface Props {
  rowLabel: string;
  seats: { id: string; status: SeatStatus }[];
  onSeatPress: (id: string) => void;
}

const SCREEN_PADDING = 32; // 16 px gutter on each side of seat-select scroll
const AISLE = 16;
const INNER_GAP = 6;
const SEATS_PER_HALF = 5;
const HALVES = 2;

const TOTAL_SEATS = SEATS_PER_HALF * HALVES;
const INNER_GAPS = (SEATS_PER_HALF - 1) * HALVES * INNER_GAP;
const NON_SEAT_WIDTH = SCREEN_PADDING + AISLE + INNER_GAPS;

const MIN_SEAT = 30;
const MAX_SEAT = 54;

/**
 * Single row of 10 seats split by the aisle (5 + 5).
 *
 * Pre-fix (RESP-C3) every tile was a hardcoded 54 dp wide — at that
 * size the row wanted 604 dp of horizontal space, which overflowed the
 * 288-dp content area on a 320-dp device (iPhone SE 1/2/3, classic
 * Android phones, foldables in cover mode). The result was clipped
 * aisle + half-rendered seats.
 *
 * We now scale the tile size to the available width:
 *   seat = clamp(MIN_SEAT, (window − non_seat) / 10, MAX_SEAT)
 *
 * Touch target is preserved by Seat.tsx hitSlop, so even at 30 dp the
 * tap area stays > 44 dp (HIG minimum).
 */
export default function SeatRow({ rowLabel, seats, onSeatPress }: Props) {
  const { width } = useWindowDimensions();
  const available = Math.max(0, width - NON_SEAT_WIDTH);
  const seatSize = Math.max(
    MIN_SEAT,
    Math.min(MAX_SEAT, Math.floor(available / TOTAL_SEATS)),
  );

  const firstHalf = seats.slice(0, 5);
  const secondHalf = seats.slice(5, 10);

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
        <View style={styles.aisle} />
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
