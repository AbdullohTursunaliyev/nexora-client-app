import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';
import CheckIcon from '../icons/CheckIcon';

export default function RealtimeBadge() {
  const t = useT();
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <CheckIcon size={12} color="#22C55E" />
        </View>
        <Text style={styles.title}>{t.zoneSelect.realtimeTitle}</Text>
      </View>
      <Text style={styles.subtitle}>{t.zoneSelect.realtimeSub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 22,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#22C55E',
  },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
});
