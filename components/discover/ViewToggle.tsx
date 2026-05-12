import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';

export type ViewMode = 'map' | 'list';

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/**
 * Full-width segmented switcher for the discover map / list views.
 *
 * Previously a 32pt compact pill that crammed up against the search
 * field. The compact form read as "yet another button" instead of the
 * deliberate view-mode switch it is. This version stretches to fill the
 * available row, mirroring the segmented-control pattern from iOS
 * Maps + Apple Music — clearly bisected pill, equal halves, gradient
 * on the active half so the affordance reads at a glance.
 *
 * Each segment is `flex: 1` so two locales with different label widths
 * ("Xarita" / "Ro'yxat" vs "Map" / "List") stay perfectly balanced.
 */
export default function ViewToggle({ value, onChange }: Props) {
  const t = useT();
  const options: { key: ViewMode; label: string }[] = [
    { key: 'map', label: t.discover.view.map },
    { key: 'list', label: t.discover.view.list },
  ];

  return (
    <View style={styles.row}>
      {options.map(({ key, label }) => {
        const isActive = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={styles.btn}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            {isActive ? (
              <LinearGradient
                colors={['#3B5BF5', '#8B3DF5']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.btnActiveGradient}
              >
                <Text style={styles.labelActive} numberOfLines={1}>
                  {label}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.btnInactive}>
                <Text style={styles.label} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 4,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  btn: {
    flex: 1,
    borderRadius: 9,
    overflow: 'hidden',
  },
  btnInactive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActiveGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  label: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#8B95A8',
  },
  labelActive: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: 0.2,
  },
});
