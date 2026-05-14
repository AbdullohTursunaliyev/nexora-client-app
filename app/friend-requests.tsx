import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import { useToast } from '../components/common/Toast';
import * as friendsApi from '../lib/api/services/friends';
import { getErrorMessage } from '../lib/api/client';
import type { FriendRequest, FriendUser } from '../lib/api/services/friends';
import MailIcon from '../components/icons/MailIcon';
import { useT } from '../lib/i18n/LocaleProvider';

export default function FriendRequestsScreen() {
  const t = useT();
  const toast = useToast();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await friendsApi.listPendingRequests();
      setRequests(data);
    } catch (e) {
      // Surface failure — silent `// noop` used to mask 401s as "no
      // pending requests" and the user had no way to retry.
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (id: number, action: 'accept' | 'reject') => {
    setActingId(id);
    try {
      await friendsApi.respondFriendRequest(id, action);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success(action === 'accept' ? t.friendRequests.acceptedToast : t.friendRequests.rejectedToast);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setActingId(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom']}>
      <SimpleHeader title={t.friendRequests.headerTitle} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <Text style={styles.subtitle}>{t.friendRequests.subtitle}</Text>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <MailIcon size={28} color="#8B95A8" />
            </View>
            <Text style={styles.emptyTitle}>{t.friendRequests.emptyTitle}</Text>
            <Text style={styles.emptyText}>{t.friendRequests.emptySub}</Text>
          </View>
        ) : (
          requests.map((r) => {
            const u = r.from_user;
            const name = displayNameOf(u);
            const isActing = actingId === r.id;
            return (
              <View key={r.id} style={styles.card}>
                <RequestAvatar uri={u.avatar_url} name={name} />
                <View style={styles.info}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.login}>@{u.login}</Text>
                </View>
                {isActing ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <View style={styles.actions}>
                    {/* Accept = solid cyan secondary, sm so it sits
                        beside the per-row info column without
                        swallowing the card width. */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => respond(r.id, 'accept')}
                      accessibilityRole="button"
                      accessibilityLabel={t.friendRequests.accept}
                      style={acceptBtnStyles.btn}
                    >
                      <Text style={acceptBtnStyles.label}>
                        {t.friendRequests.accept}
                      </Text>
                    </TouchableOpacity>
                    {/* Reject = ghost-style cyan label, no fill, so
                        the destructive secondary action reads as
                        clearly subordinate to Accept. */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => respond(r.id, 'reject')}
                      accessibilityRole="button"
                      accessibilityLabel={t.friendRequests.reject}
                      style={rejectBtnStyles.btn}
                    >
                      <Text style={rejectBtnStyles.label}>
                        {t.friendRequests.reject}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Reusable display-name helper — matches the one in friends-list.
 * Falls back through "First Last" → "First" → "@login" → "User".
 */
function displayNameOf(u: Pick<FriendUser, 'first_name' | 'last_name' | 'login'>): string {
  const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  return full || u.login || 'User';
}

/**
 * Avatar tile with graceful fallback — same component idea as
 * friends-list's AvatarTile (kept duplicated locally to avoid a
 * shared-component file just for this; if we add a third consumer
 * we'll lift it into `components/common/AvatarTile.tsx`).
 *
 * Pre-fix this screen used `Images.avatar` (a `require()`-d static
 * asset) as the `{uri}` source. Image interprets that as a literal
 * URI string, so broken-avatar rows rendered the React Native
 * broken-image glyph instead of a friendly placeholder.
 */
function RequestAvatar({ uri, name }: { uri?: string; name: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = !!uri && !broken;
  if (!showImage) {
    return (
      <View style={[styles.avatar, styles.avatarFallback]}>
        <User size={20} color="#00CFFF" strokeWidth={1.8} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.avatar}
      onError={() => setBroken(true)}
      accessibilityLabel={name}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 149, 168, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    color: Colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: {
    backgroundColor: '#1F2533',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontFamily: Fonts.inter.semiBold, fontSize: 13.5, color: Colors.text },
  login: { fontFamily: Fonts.inter.regular, fontSize: 11.5, color: '#8B95A8', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
});

// Inline accept/reject pair — sm (38pt) inline pills so the row
// keeps the avatar + name + actions all on a single line without
// pushing the card width. Accept uses the solid cyan secondary
// treatment; Reject is a ghost (no fill) cyan label.
const acceptBtnStyles = StyleSheet.create({
  btn: {
    height: 38,
    borderRadius: 999,
    backgroundColor: '#00CFFF',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  label: {
    color: '#0B0F16',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    letterSpacing: 0.1,
  },
});

const rejectBtnStyles = StyleSheet.create({
  btn: {
    height: 38,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#00CFFF',
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
