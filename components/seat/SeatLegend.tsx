import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';

export default function SeatLegend() {
  const t = useT();
  const items = [
    { color: '#22C55E', label: t.seatSelect.legendAvailable, filled: false },
    { color: '#EF4444', label: t.seatSelect.legendTaken, filled: true },
    { color: '#00CFFF', label: t.seatSelect.legendSelected, filled: true },
  ];
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <View
            style={[
              styles.dot,
              item.filled
                ? { backgroundColor: item.color }
                : { borderColor: item.color, borderWidth: 1.5 },
            ]}
          />
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  label: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#8B95A8',
  },
});
