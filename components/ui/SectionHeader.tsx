import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';

interface Props {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  emoji?: string;
}

/**
 * Standard section header used across the home / discover / wallet
 * screens. The action link in the top-right is only rendered when
 * BOTH `actionLabel` and `onAction` are provided — pre-fix passing
 * only `actionLabel` rendered a tappable text that did nothing,
 * which the audit flagged as a dead tap target.
 */
export default function SectionHeader({ title, actionLabel, onAction, emoji }: Props) {
  const showAction = !!actionLabel && !!onAction;

  return (
    <View style={styles.row}>
      <View style={styles.titleRow}>
        {emoji && <Text style={styles.emoji}>{emoji}</Text>}
        <Text style={styles.title}>{title}</Text>
      </View>
      {showAction && (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 16,
  },
  title: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: Colors.text,
  },
  action: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#00CFFF',
  },
});
