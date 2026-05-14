import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  selectedSeat: string | null;
  zoneLabel?: string;
  priceLabel?: string;
  bottomInset: number;
  onContinue: () => void;
}

export default function SeatBottomBar({
  selectedSeat,
  zoneLabel,
  priceLabel,
  bottomInset,
  onContinue,
}: Props) {
  const t = useT();
  const disabled = !selectedSeat;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(bottomInset, 12) }]}>
      {selectedSeat && (zoneLabel || priceLabel) && (
        <View style={styles.infoPill}>
          <Text style={styles.infoSeat}>{selectedSeat}</Text>
          {zoneLabel && (
            <>
              <Text style={styles.infoSep}>·</Text>
              <Text style={styles.infoZone}>{zoneLabel}</Text>
            </>
          )}
          {priceLabel && (
            <>
              <View style={styles.spacer} />
              <Text style={styles.infoPrice}>{priceLabel}</Text>
            </>
          )}
        </View>
      )}

      {!selectedSeat && (
        <View style={styles.label}>
          <Text style={styles.labelText}>{t.seatSelect.selectedLabel}</Text>
          <Text style={styles.value}>—</Text>
        </View>
      )}

      {/* Inline Continue CTA — 52pt full-width gradient pill. Pre-fix
          this used the shared <Button /> at size="lg" + fullWidth; we
          inline so the seat-select bottom bar's CTA shape stays
          locally tunable without dragging the rest of the app. */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onContinue}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t.seatSelect.continue}
        accessibilityState={{ disabled }}
        style={[continueBtnStyles.btn, disabled && continueBtnStyles.btnDisabled]}
      >
        <LinearGradient
          colors={['#3B5BF5', '#8B3DF5']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={continueBtnStyles.fill}
        >
          <Text
            style={continueBtnStyles.label}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {t.seatSelect.continue}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // No shadow / elevation: top border + dark background already
  // separates the sticky bar from the scroll above.
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 10,
  },
  infoSeat: {
    fontFamily: Fonts.inter.bold,
    fontSize: 13,
    color: '#00CFFF',
    letterSpacing: 0.3,
  },
  infoSep: {
    color: '#5A6A85',
    fontSize: 13,
  },
  infoZone: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12,
    color: '#A8B0BF',
  },
  infoPrice: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12.5,
    color: Colors.text,
  },
  spacer: {
    flex: 1,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  labelText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    color: '#8B95A8',
  },
  value: {
    fontFamily: Fonts.inter.bold,
    fontSize: 16,
    color: '#00CFFF',
    letterSpacing: 0.2,
  },
});

const continueBtnStyles = StyleSheet.create({
  btn: { height: 52, borderRadius: 999, alignSelf: 'stretch', overflow: 'hidden' },
  btnDisabled: { opacity: 0.5 },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});
