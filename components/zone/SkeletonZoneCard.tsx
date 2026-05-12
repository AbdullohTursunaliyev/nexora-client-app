import { View, StyleSheet } from 'react-native';
import Skeleton from '../common/Skeleton';

export default function SkeletonZoneCard() {
  return (
    <View style={styles.card}>
      <Skeleton width={110} height={130} borderRadius={0} />
      <View style={styles.content}>
        <View style={{ gap: 6 }}>
          <Skeleton width="65%" height={15} />
          <Skeleton width="90%" height={11} />
          <Skeleton width="70%" height={11} />
        </View>
        <View style={styles.bottomRow}>
          <Skeleton width={90} height={22} borderRadius={6} />
          <Skeleton width={70} height={13} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#141823',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
  },
  content: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
