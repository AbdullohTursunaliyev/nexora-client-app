import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import WalletIcon from '../icons/WalletIcon';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  balance: number;
}

function formatSum(value: number): string {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ');
}

/**
 * Membership balance strip rendered on the club details page.
 *
 * The "Top up" pill that used to live on the right is hidden
 * pre-launch — same `/wallet-topup` soon-gate as the wallet tab.
 * The balance itself stays live (sourced from `auth/me`). Restore
 * the pill + `router.push('/wallet-topup')` handler when PSP
 * integration ships.
 */
export default function MembershipBar({ balance }: Props) {
  const t = useT();
  return (
    <View style={styles.bar}>
      <View style={styles.iconWrap}>
        <WalletIcon size={14} color="#00CFFF" />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.label}>{t.components.membershipBalance}</Text>
        <Text style={styles.value}>{formatSum(balance)} so'm</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.22)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 207, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#8B95A8',
  },
  value: {
    fontFamily: Fonts.inter.bold,
    fontSize: 14,
    color: Colors.text,
  },
});
