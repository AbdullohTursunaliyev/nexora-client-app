import { View, StyleSheet } from 'react-native';
import Skeleton from '../common/Skeleton';

export default function SkeletonPromotionCard() {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Skeleton width="65%" height={18} />
        <Skeleton width="40%" height={13} />
        <Skeleton width="55%" height={11} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 140,
    borderRadius: 18,
    backgroundColor: '#1A1F2B',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  content: {
    padding: 14,
    gap: 6,
  },
});
