import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import PlusIcon from '../icons/PlusIcon';
import CoinIcon from '../icons/CoinIcon';
import { useT } from '../../lib/i18n/LocaleProvider';

export default function WalletCard() {
  const t = useT();
  return (
    <LinearGradient
      colors={['#3B1F6F', '#1F1B4E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.left}>
        <View style={styles.balancePill}>
          <Text style={styles.balanceLabel}>{t.components.walletBalanceLabel}</Text>
        </View>
        <Text style={styles.amount}>1 240 000 so'm</Text>
        <View style={styles.ballRow}>
          <CoinIcon size={14} />
          <Text style={styles.ballText}>1 560 {t.components.walletPointsLabel}</Text>
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.85}>
        <LinearGradient
          colors={['#00CFFF', '#3B5BF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.plusButton}
        >
          <PlusIcon size={24} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 18,
    marginTop: 18,
  },
  left: {
    flex: 1,
    gap: 8,
  },
  balancePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  balanceLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11.5,
    color: '#C4B5FD',
  },
  amount: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  ballRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  ballText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#C4B5FD',
  },
  plusButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
