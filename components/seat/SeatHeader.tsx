import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';
import { useDialog } from '../common/AppDialog';
import BackIcon from '../icons/BackIcon';
import CloseIcon from '../icons/CloseIcon';

export default function SeatHeader() {
  const t = useT();
  const dialog = useDialog();

  const exitFlow = async () => {
    const ok = await dialog.confirm({
      title: t.bookingExit.title,
      message: t.bookingExit.message,
      confirmLabel: t.bookingExit.confirm,
      cancelLabel: t.bookingExit.cancel,
      destructive: true,
    });
    if (ok) router.replace('/(tabs)');
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <BackIcon size={20} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.titleBlock}>
        <Text style={styles.counter}>{t.seatSelect.headerStep}</Text>
        <Text style={styles.title}>{t.seatSelect.headerTitle}</Text>
      </View>

      <TouchableOpacity
        style={styles.iconBtn}
        onPress={exitFlow}
        activeOpacity={0.7}
      >
        <CloseIcon size={18} color="#8B95A8" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#141823',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counter: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 13,
    color: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 1,
  },
  title: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12,
    color: Colors.text,
    letterSpacing: 1.2,
  },
});
