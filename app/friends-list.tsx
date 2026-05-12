import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { Images } from '../constants/Images';
import SimpleHeader from '../components/common/SimpleHeader';
import { useToast } from '../components/common/Toast';
import * as friendsApi from '../lib/api/services/friends';
import { getErrorMessage } from '../lib/api/client';
import type { FriendUser, FriendRequest } from '../lib/api/services/friends';
import UsersIcon from '../components/icons/UsersIcon';
import MailIcon from '../components/icons/MailIcon';
import SearchIcon from '../components/icons/SearchIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import Button from '../components/common/Button';
import { useT } from '../lib/i18n/LocaleProvider';
import KeyboardSafeView from '../components/common/KeyboardSafeView';

export default function FriendsListScreen() {
  const t = useT();
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [pending, setPending] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Error state — pre-fix (FE-M2) the catches swallowed the network
  // failure into empty arrays, so a session-expired user saw "no
  // friends" instead of an error message.
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendUser[]>([]);
  const [searching, setSearching] = useState(false);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Single network request — the BE returns both friends + pending
      // in one payload, so we don't fan out two identical GETs.
      const data = await friendsApi.listFriendsAndRequests();
      setFriends(data.friends);
      setPending(data.pending);
    } catch {
      setLoadError(t.common.error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const onSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const found = await friendsApi.searchFriends(query.trim());
      setResults(found);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const onSendRequest = async (userId: number) => {
    try {
      await friendsApi.sendFriendRequest(userId);
      toast.success(t.friends.sentToast);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const onRemove = async (userId: number) => {
    try {
      await friendsApi.removeFriend(userId);
      toast.info(t.friends.removedToast);
      await loadFriends();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadFriends();
    } finally {
      setRefreshing(false);
    }
  };

  const renderFriend = (u: FriendUser) => {
    const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.login;
    return (
      <View key={u.id} style={styles.userCard}>
        <Image source={{ uri: u.avatar_url || Images.avatar }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userLogin}>@{u.login}</Text>
        </View>
        <Button
          label={t.friends.removeBtn}
          variant="ghost"
          size="sm"
          onPress={() => onRemove(u.id)}
        />
      </View>
    );
  };

  const renderSearchResult = (u: FriendUser) => {
    const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.login;
    return (
      <View key={u.id} style={styles.userCard}>
        <Image source={{ uri: u.avatar_url || Images.avatar }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userLogin}>@{u.login}</Text>
        </View>
        <Button
          label={t.friends.addBtn}
          variant="secondary"
          size="sm"
          onPress={() => onSendRequest(u.id)}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardSafeView>
      <SimpleHeader title={t.friends.headerTitle} />

      <View style={styles.tabsContainer}>
        {[t.friends.tabMine, t.friends.tabSearch].map((label, i) => {
          const isActive = tab === i;
          return (
            <Pressable
              key={label}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setTab(i)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 0 ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          {pending.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.requestsBanner}
              onPress={() => router.push('/friend-requests')}
            >
              <View style={styles.requestsBannerIcon}>
                <MailIcon size={18} color="#00CFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestsBannerTitle}>
                  {t.friends.pendingTitle.replace('{n}', String(pending.length))}
                </Text>
                <Text style={styles.requestsBannerSub}>{t.friends.pendingSub}</Text>
              </View>
              <ChevronRightIcon size={18} color="#8B95A8" />
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>
            {t.friends.sectionMine.replace('{n}', String(friends.length))}
          </Text>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
          ) : loadError ? (
            // Pre-fix `loadError` was set but never rendered — a 401 /
            // network failure looked like "you have no friends" with no
            // hint of an actual problem. Now we surface it explicitly
            // so the user can retry instead of staring at fake silence.
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <UsersIcon size={28} color="#EF4444" />
              </View>
              <Text style={styles.emptyTitle}>{loadError}</Text>
              <Button
                label={t.common.retry}
                variant="primary"
                size="sm"
                onPress={loadFriends}
              />
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <UsersIcon size={28} color="#8B95A8" />
              </View>
              <Text style={styles.emptyTitle}>{t.friends.emptyTitle}</Text>
              <Text style={styles.emptyText}>{t.friends.emptySub}</Text>
            </View>
          ) : (
            friends.map(renderFriend)
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.searchBar}>
            <SearchIcon size={16} color="#8B95A8" />
            <TextInput
              style={styles.searchInput}
              placeholder={t.friends.searchPlaceholder}
              placeholderTextColor="#6B7280"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={onSearch}
              autoCapitalize="none"
            />
            {searching && <ActivityIndicator color={Colors.primary} />}
          </View>

          {results.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <SearchIcon size={28} color="#8B95A8" />
              </View>
              <Text style={styles.emptyTitle}>{t.friends.searchEmptyTitle}</Text>
              <Text style={styles.emptyText}>{t.friends.searchEmptySub}</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionTitle}>
                {t.friends.foundCount.replace('{n}', String(results.length))}
              </Text>
              {results.map(renderSearchResult)}
            </View>
          )}
        </ScrollView>
      )}
      </KeyboardSafeView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 4,
    height: 42,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: '#1F2533' },
  tabText: { fontFamily: Fonts.inter.medium, fontSize: 13, color: '#8B95A8' },
  tabTextActive: { color: Colors.text, fontFamily: Fonts.inter.semiBold },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 207, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.25)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 14,
  },
  requestsBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 207, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsBannerTitle: { fontFamily: Fonts.inter.semiBold, fontSize: 13.5, color: Colors.text },
  requestsBannerSub: { fontFamily: Fonts.inter.regular, fontSize: 11.5, color: '#8B95A8', marginTop: 2 },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 8,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    color: Colors.text,
    paddingVertical: 0,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  userInfo: { flex: 1 },
  userName: { fontFamily: Fonts.inter.semiBold, fontSize: 13.5, color: Colors.text },
  userLogin: { fontFamily: Fonts.inter.regular, fontSize: 11.5, color: '#8B95A8', marginTop: 2 },
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
});
