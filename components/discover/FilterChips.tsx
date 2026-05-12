import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';

export type FilterKey = 'all' | 'pc' | 'ps' | 'open';

interface Props {
  value: FilterKey;
  onChange: (key: FilterKey) => void;
}

/**
 * Quick filter chips for the discover header.
 *
 * Sits BETWEEN the search row and the Map/List segmented switch. The
 * gradient on the active chip matches the active half of `ViewToggle`
 * so the two controls feel like siblings rather than two unrelated
 * styles. Each chip is 36pt tall — comfortably above the 44pt tap
 * target rule when combined with the implicit 8pt vertical padding
 * around the scroll row.
 *
 * Scrollable horizontally so locales with longer labels ("Ochiq hozir",
 * "Открыто сейчас") never push the row off-screen.
 */
const CHIPS: { key: FilterKey; labelKey: 'all' | 'pc' | 'ps' | 'open' }[] = [
  { key: 'all', labelKey: 'all' },
  { key: 'pc', labelKey: 'pc' },
  { key: 'ps', labelKey: 'ps' },
  { key: 'open', labelKey: 'open' },
];

export default function FilterChips({ value, onChange }: Props) {
  const t = useT();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CHIPS.map(({ key, labelKey }) => {
        const isActive = value === key;
        const label = t.discover.filters[labelKey];
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            activeOpacity={0.85}
            style={styles.chipWrap}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            {isActive ? (
              <LinearGradient
                colors={['#3B5BF5', '#8B3DF5']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.chipActive}
              >
                <Text style={styles.chipTextActive} numberOfLines={1}>
                  {label}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.chipInactive}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  chipWrap: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  chipInactive: {
    height: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#141823',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipActive: {
    height: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 10,
  },
  chipText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#8B95A8',
  },
  chipTextActive: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
