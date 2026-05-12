import { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useAuth } from '../../store/AuthProvider';
import BackIcon from '../icons/BackIcon';
import BellIcon from '../icons/BellIcon';
import UserAvatar from './UserAvatar';

type RightVariant = 'bell' | 'avatar' | 'none';

interface Props {
  title: string;
  /** What to show on the right side. Defaults to a notification bell. */
  rightVariant?: RightVariant;
  /** Override the default right element entirely. */
  right?: ReactNode;
  /** Show a red dot on the bell when there are unread items. */
  unreadCount?: number;
  /** Hide the back button (e.g. for tab-rooted screens). */
  showBack?: boolean;
}

export default function SimpleHeader({
  title,
  rightVariant = 'bell',
  right,
  unreadCount = 0,
  showBack = true,
}: Props) {
  const { user } = useAuth();
  const showBadge = unreadCount > 0;
  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  const renderRight = () => {
    if (right) return right;
    if (rightVariant === 'none') return <View style={styles.iconBtn} />;
    if (rightVariant === 'avatar') {
      return (
        <TouchableOpacity
          activeOpacity={0.75}
          hitSlop={6}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <UserAvatar avatarUrl={user?.avatar_url} size={33} ring />
        </TouchableOpacity>
      );
    }
    // default 'bell'
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        // 38x38 visual + 6px hitSlop on every side = 50pt effective
        // tap target, comfortably above iOS HIG 44pt and Material 48dp
        // (RESP-H4).
        hitSlop={6}
        onPress={() => router.push('/notifications')}
        style={[styles.iconBtnFilled, showBadge && styles.iconBtnActive]}
      >
        <BellIcon size={18} color={showBadge ? '#00CFFF' : Colors.text} />
        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.row}>
      {showBack ? (
        <TouchableOpacity
          style={styles.iconBtnFilled}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={6}
        >
          <BackIcon size={20} color={Colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      {renderRight()}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnFilled: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#141823',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
    borderColor: 'rgba(0, 207, 255, 0.35)',
  },
  title: {
    flex: 1,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#080F16',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 9,
    color: '#FFFFFF',
    lineHeight: 11,
  },
});
