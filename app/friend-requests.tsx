import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { Images } from '../constants/Images';
import SimpleHeader from '../components/common/SimpleHeader';
import { useToast } from '../components/common/Toast';
import * as friendsApi from '../lib/api/services/friends';
import { getErrorMessage } from '../lib/api/client';
import type { FriendRequest } from '../lib/api/services/friends';
import MailIcon from '../components/icons/MailIcon';
import Button from '../components/common/Button';
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
            const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.login;
            const isActing = actingId === r.id;
            return (
              <View key={r.id} style={styles.card}>
                <Image source={{ uri: u.avatar_url || Images.avatar }} style={styles.avatar} />
                <View style={styles.info}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.login}>@{u.login}</Text>
                </View>
                {isActing ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <View style={styles.actions}>
                    <Button
                      label={t.friendRequests.accept}
                      variant="secondary"
                      size="sm"
                      onPress={() => respond(r.id, 'accept')}
                    />
                    <Button
                      label={t.friendRequests.reject}
                      variant="ghost"
                      size="sm"
                      onPress={() => respond(r.id, 'reject')}
                    />
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
  info: { flex: 1 },
  name: { fontFamily: Fonts.inter.semiBold, fontSize: 13.5, color: Colors.text },
  login: { fontFamily: Fonts.inter.regular, fontSize: 11.5, color: '#8B95A8', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
});
