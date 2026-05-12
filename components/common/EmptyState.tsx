import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';

interface Props {
  emoji?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ emoji = '✨', title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity activeOpacity={0.85} onPress={onAction} style={styles.actionBtn}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emoji: { fontSize: 48 },
  title: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: Colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: 14,
    backgroundColor: '#00CFFF',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionText: { fontFamily: Fonts.inter.semiBold, fontSize: 13, color: '#080F16' },
});
