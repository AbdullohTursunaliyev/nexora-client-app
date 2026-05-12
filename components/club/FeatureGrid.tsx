import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import ChipIcon from '../icons/ChipIcon';
import GamepadIcon from '../icons/GamepadIcon';
import WifiIcon from '../icons/WifiIcon';
import PremiumIcon from '../icons/PremiumIcon';
import { useT } from '../../lib/i18n/LocaleProvider';

const ACCENT_COLORS = ['#00E5FF', '#A78BFA', '#22C55E', '#F59E0B'];

export default function FeatureGrid() {
  const t = useT();

  const features = [
    { id: '1', label: t.clubDetails.feature1, Icon: ChipIcon },
    { id: '2', label: t.clubDetails.feature2, Icon: GamepadIcon },
    { id: '3', label: t.clubDetails.feature3, Icon: WifiIcon },
    { id: '4', label: t.clubDetails.feature4, Icon: PremiumIcon },
  ];

  return (
    <View style={styles.row}>
      {features.map(({ id, label, Icon }, idx) => {
        const color = ACCENT_COLORS[idx];
        return (
          <View key={id} style={styles.item}>
            <View style={[styles.iconWrap, { backgroundColor: `${color}1F` }]}>
              <Icon size={18} color={color} />
            </View>
            <Text
              style={styles.label}
              numberOfLines={2}
              // Hard-cap the chip text at 2 lines. Pre-fix labels with
              // an explicit `\n` could still wrap a third time when the
              // second segment (e.g. RU "производит.") didn't fit the
              // narrow ~70pt chip width — the trailing period popped
              // onto a 3rd row and the grid heights went out of sync.
              // The truncation is paired with shorter translations in
              // translations.ts so the visible label still reads as a
              // complete phrase.
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  item: {
    flex: 1,
    backgroundColor: '#141823',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
});
