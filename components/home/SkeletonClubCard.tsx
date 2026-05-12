import { View, StyleSheet } from 'react-native';
import Skeleton from '../common/Skeleton';

export default function SkeletonClubCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={120} borderRadius={0} />
      <View style={styles.body}>
        <Skeleton width="75%" height={14} />
        <Skeleton width="55%" height={11} />
        <View style={styles.bottomRow}>
          <Skeleton width={80} height={20} borderRadius={6} />
          <Skeleton width={28} height={28} borderRadius={14} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141823',
    borderRadius: 18,
    overflow: 'hidden',
  },
  body: {
    padding: 14,
    gap: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
