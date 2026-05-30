import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { User } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import { useToast } from '../components/common/Toast';
import { useDialog } from '../components/common/AppDialog';
import * as friendsApi from '../lib/api/services/friends';
import { getErrorMessage } from '../lib/api/client';
import type {
  FriendUser,
  FriendRequest,
  FriendSearchResult,
  FriendRelationStatus,
  FriendActivityItem,
} from '../lib/api/services/friends';
import UsersIcon from '../components/icons/UsersIcon';
import MailIcon from '../components/icons/MailIcon';
import SearchIcon from '../components/icons/SearchIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import KeyboardSafeView from '../components/common/KeyboardSafeView';

/**
 * Tab enum — replaces the old magic-number state (0 = "Mine", 1 =
 * "Search"). Strings carry meaning in stack traces and survive a
 * future refactor when we add a third tab (e.g. "Sent").
 */
type Tab = 'mine' | 'search';

const MIN_SEARCH_QUERY = 1;

export default function FriendsListScreen() {
  const t = useT();
  const toast = useToast();
  const dialog = useDialog();
  const [tab, setTab] = useState<Tab>('mine');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [pending, setPending] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Error state — pre-fix (FE-M2) the catches swallowed the network
  // failure into empty arrays, so a session-expired user saw "no
  // friends" instead of an error message.
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  // Distinguishes "user hasn't searched yet" from "search returned
  // zero". Pre-fix both states showed the same "search empty" card,
  // which read as "we don't know anyone" before the user typed.
  const [hasSearched, setHasSearched] = useState(false);

  /**
   * Per-row action lock — keys are mobile_user_ids that have an
   * in-flight POST/DELETE. We render a spinner instead of the
   * action button while a row is locked, which stops double-tap
   * from firing duplicate sendRequest / remove POSTs.
   *
   * Pre-fix the screen had ONE shared `loading` flag — async
   * actions weren't gated at all and a user with a heavy thumb
   * could trigger 2-3 sendRequest calls before the toast appeared.
   * The BE row-lock catches the duplicate at the DB level, but the
   * FE-side spinner is the better UX.
   */
  const [actingIds, setActingIds] = useState<Set<number>>(new Set());
  const lockRow = useCallback((id: number) => {
    setActingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);
  const unlockRow = useCallback((id: number) => {
    setActingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Single network request — the BE returns friends + incoming +
      // outgoing in one payload, so we don't fan out three GETs.
      const data = await friendsApi.listFriendsAndRequests();
      setFriends(data.friends);
      setPending(data.pending);
      setOutgoing(data.outgoing);
    } catch (e) {
      setLoadError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFriends();
  }, [loadFriends]);

  // Live activity rollup — polled every ~12 s while the "mine" tab
  // is visible. Stops polling when the user switches to search
  // (saves bandwidth) and resumes on tab change. The activity payload
  // is keyed by mobile_user_id so the UI overlay below joins it to
  // the friends list by `friend.id === activity.mobile_user_id`.
  const [activity, setActivity] = useState<
    Record<number, FriendActivityItem>
  >({});
  useEffect(() => {
    if (tab !== 'mine') return;
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const rows = await friendsApi.friendActivity();
        if (cancelled) return;
        const map: Record<number, FriendActivityItem> = {};
        for (const row of rows) {
          map[row.id] = row;
        }
        setActivity(map);
      } catch {
        // Activity is informational — a failed poll shouldn't bother
        // the user with a toast. Keep the previous snapshot until
        // the next tick succeeds.
      }
    };
    void fetchOnce();
    const id = setInterval(fetchOnce, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tab]);

  const onSearch = async () => {
    const q = query.trim();
    if (q.length < MIN_SEARCH_QUERY) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const found = await friendsApi.searchFriends(q);
      setResults(found);
    } catch (e) {
      toast.error(getErrorMessage(e));
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onSendRequest = async (userId: number) => {
    if (actingIds.has(userId)) return;
    lockRow(userId);
    try {
      // Read the BE-reported status. When the recipient ALREADY had
      // a pending request to us, the BE auto-promotes the pair to
      // 'accepted' and returns status='accepted'. Without this read
      // the FE would optimistically flip the row to 'outgoing' (Sent)
      // for a row that's actually now a friend — a brief but
      // confusing visual stutter until the next loadFriends() resync.
      const res = await friendsApi.sendFriendRequest(userId);
      const becameFriend = res.status === 'accepted';
      toast.success(becameFriend ? t.friendRequests.acceptedToast : t.friends.sentToast);
      setResults((prev) =>
        prev.map((r) =>
          r.id === userId
            ? { ...r, relation_status: becameFriend ? 'accepted' : 'outgoing' }
            : r,
        ),
      );
      if (becameFriend) {
        // Refresh the Mine tab so the new friend shows up in the list
        // next time the user navigates to it. We don't await — the
        // search-tab UI has already updated optimistically.
        void loadFriends();
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      unlockRow(userId);
    }
  };

  /**
   * Cancel an outgoing pending request from inside a SearchResultRow.
   * Same actingIds + error toast path as the Mine-tab cancel handler,
   * so the search tab's UI guarantees match the friends tab's.
   * Pre-fix this was an inline arrow with no lock + silent failure on
   * BE error — a regression vs. the other action paths.
   */
  const onCancelFromSearch = async (userId: number) => {
    if (actingIds.has(userId)) return;
    lockRow(userId);
    try {
      await friendsApi.cancelOutgoingRequest(userId);
      toast.info(t.friends.cancelledToast);
      setResults((prev) =>
        prev.map((r) => (r.id === userId ? { ...r, relation_status: 'none' } : r)),
      );
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      unlockRow(userId);
    }
  };

  const onRemove = async (userId: number, displayName: string) => {
    if (actingIds.has(userId)) return;
    // Confirm before destructive removal — pre-fix a single tap
    // unfriended without any prompt, and the toast that confirmed
    // "removed" appeared AFTER the row was already gone. An
    // accidental tap had no recovery path (the user would have to
    // re-find and re-friend the person).
    const ok = await dialog.confirm({
      title: t.friends.removeConfirmTitle,
      message: t.friends.removeConfirmMessage.replace('{name}', displayName),
      confirmLabel: t.friends.removeConfirmYes,
      cancelLabel: t.friends.removeConfirmNo,
      destructive: true,
    });
    if (!ok) return;
    lockRow(userId);
    try {
      await friendsApi.removeFriend(userId);
      toast.info(t.friends.removedToast);
      // Optimistic remove from local list — saves an extra round-trip
      // and keeps the UI responsive while loadFriends() refetches in
      // the background.
      setFriends((prev) => prev.filter((f) => f.id !== userId));
      void loadFriends();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      unlockRow(userId);
    }
  };

  const onCancelOutgoing = async (requestId: number, recipientUserId: number) => {
    if (actingIds.has(recipientUserId)) return;
    lockRow(recipientUserId);
    try {
      // BE deletes the friendship regardless of status, so the
      // remove endpoint works for cancel-outgoing too. Semantic
      // alias keeps the call site readable.
      await friendsApi.cancelOutgoingRequest(recipientUserId);
      toast.info(t.friends.cancelledToast);
      setOutgoing((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      unlockRow(recipientUserId);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (tab === 'mine') {
        await loadFriends();
      } else {
        await onSearch();
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Friends-tab header counts. Memoised so a parent re-render
  // doesn't recompute the section headings unnecessarily.
  const friendsCountLabel = useMemo(
    () => t.friends.sectionMine.replace('{n}', String(friends.length)),
    [friends.length, t],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardSafeView>
        <SimpleHeader title={t.friends.headerTitle} />

        <View style={styles.tabsContainer}>
          {(['mine', 'search'] as Tab[]).map((id) => {
            const isActive = tab === id;
            const label = id === 'mine' ? t.friends.tabMine : t.friends.tabSearch;
            return (
              <Pressable
                key={id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setTab(id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'mine' ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            }
          >
            {pending.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.requestsBanner}
                onPress={() => router.push('/friend-requests')}
                accessibilityRole="button"
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

            {/* Outgoing section — pre-fix the BE returned these but
                the FE silently dropped them, so a user with 3
                "waiting" requests had no idea they existed and no
                way to cancel them. Now they live in a dedicated
                section with a Cancel button per row. */}
            {outgoing.length > 0 && (
              <View style={styles.outgoingWrap}>
                <Text style={styles.outgoingTitle}>
                  {t.friends.outgoingTitle.replace('{n}', String(outgoing.length))}
                </Text>
                {outgoing.map((r) => {
                  const u = r.from_user;
                  const name = displayNameOf(u);
                  return (
                    <View key={r.id} style={styles.userCard}>
                      <AvatarTile uri={u.avatar_url} name={name} />
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{name}</Text>
                        <Text style={styles.userLogin}>@{u.login}</Text>
                      </View>
                      {actingIds.has(u.id) ? (
                        <ActivityIndicator color={Colors.primary} />
                      ) : (
                        // Cancel-outgoing — sm ghost cyan text so the
                        // destructive "cancel my own pending request"
                        // sits quietly to the right of the row's
                        // info column without competing for attention.
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => onCancelOutgoing(r.id, u.id)}
                          accessibilityRole="button"
                          accessibilityLabel={t.friends.cancelBtn}
                          style={cancelBtnStyles.btn}
                        >
                          <Text
                            style={cancelBtnStyles.label}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.85}
                          >
                            {t.friends.cancelBtn}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={styles.sectionTitle}>{friendsCountLabel}</Text>

            {loading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
            ) : loadError ? (
              // Pre-fix `loadError` was set but never rendered — a 401
              // / network failure looked like "you have no friends"
              // with no hint of an actual problem. Now we surface it
              // explicitly so the user can retry.
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <UsersIcon size={28} color="#EF4444" />
                </View>
                <Text style={styles.emptyTitle}>{loadError}</Text>
                {/* Retry CTA — sm primary so it reads as actionable
                    inside the error card without dwarfing the
                    error message above. */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={loadFriends}
                  accessibilityRole="button"
                  accessibilityLabel={t.common.retry}
                  style={retryBtnStyles.btn}
                >
                  <LinearGradient
                    colors={['#3B5BF5', '#8B3DF5']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={retryBtnStyles.fill}
                  >
                    <Text
                      style={retryBtnStyles.label}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      {t.common.retry}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
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
              friends.map((u) => {
                const name = displayNameOf(u);
                const isActing = actingIds.has(u.id);
                const act = activity[u.id] ?? null;
                const isLive = act?.status === 'in_session';
                return (
                  <View key={u.id} style={styles.userCard}>
                    <View style={styles.avatarWrap}>
                      <AvatarTile uri={u.avatar_url} name={name} />
                      {/* Live dot — only painted when the friend is
                          actively playing somewhere. Pull-from-polling
                          via the activity map above. */}
                      {isLive && <View style={styles.liveDot} />}
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName} numberOfLines={1}>{name}</Text>
                      {isLive && act?.current_club && act?.current_pc ? (
                        <Text style={styles.userLive} numberOfLines={1}>
                          {t.friends.playingNow
                            .replace('{pc}', act.current_pc.code)
                            .replace('{club}', act.current_club.tenant_name)}
                        </Text>
                      ) : (
                        <Text style={styles.userLogin} numberOfLines={1}>@{u.login}</Text>
                      )}
                    </View>
                    {isActing ? (
                      <ActivityIndicator color={Colors.primary} />
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onRemove(u.id, name)}
                        accessibilityRole="button"
                        accessibilityLabel={t.friends.removeBtn}
                        style={removeBtnStyles.btn}
                      >
                        <Text
                          style={removeBtnStyles.label}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.85}
                        >
                          {t.friends.removeBtn}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            }
          >
            <View style={styles.searchBar}>
              <SearchIcon size={16} color="#8B95A8" />
              <TextInput
                style={styles.searchInput}
                placeholder={t.friends.searchPlaceholder}
                placeholderTextColor="#6B7280"
                value={query}
                onChangeText={(v) => {
                  setQuery(v);
                  if (v.trim().length === 0) {
                    setResults([]);
                    setHasSearched(false);
                  }
                }}
                onSubmitEditing={onSearch}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                // Hint the OS to surface the digit-friendly keyboard
                // by default. Users can still type letters for name
                // search (the BE branches on input shape: 6+ digits
                // → phone match, anything else → name/login). iOS
                // honours `phone-pad` while still letting the user
                // switch to the alphabetic layout from the bar.
                keyboardType="phone-pad"
                maxLength={64}
                editable={!searching}
              />
              {searching && <ActivityIndicator color={Colors.primary} />}
            </View>

            {/* Three distinct empty states:
                  1. User hasn't searched yet → "type to search" hint
                  2. Search returned zero → "no users match" message
                  3. Has results → render rows
                Pre-fix #1 and #2 were collapsed into the same card,
                so the prompt before searching read as "you have no
                friends to search". */}
            {!hasSearched ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <SearchIcon size={28} color="#8B95A8" />
                </View>
                <Text style={styles.emptyTitle}>{t.friends.searchPromptTitle}</Text>
                <Text style={styles.emptyText}>{t.friends.searchPromptSub}</Text>
              </View>
            ) : results.length === 0 ? (
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
                {results.map((u) => (
                  <SearchResultRow
                    key={u.id}
                    user={u}
                    actingIds={actingIds}
                    // Accept-incoming uses the same send endpoint — BE
                    // auto-promotes the reverse-pending pair to
                    // accepted. `onSendRequest` now reads the returned
                    // status and flips the row directly to 'accepted'
                    // for this case (no flash of 'outgoing'), so we
                    // reuse the same handler here.
                    onSend={onSendRequest}
                    onAccept={onSendRequest}
                    onCancel={onCancelFromSearch}
                    labels={t}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardSafeView>
    </SafeAreaView>
  );
}

/**
 * Reusable display-name helper. Falls back through the form
 * "First Last" → "First" → "@login" → fallback "User".
 */
function displayNameOf(u: { first_name?: string; last_name?: string; login: string }): string {
  const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  return full || u.login || 'User';
}

/**
 * Avatar tile — handles BOTH "no URL provided" and "URL provided
 * but image failed to load" cases by rendering a Lucide User icon
 * on a tinted background. Pre-fix the screen used
 * `Images.avatar` as the `{uri}` source which is a `require()`-d
 * static — the Image component interpreted it as a literal URI
 * string and rendered a broken-image glyph.
 */
function AvatarTile({ uri, name }: { uri?: string; name: string }) {
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

/**
 * Single search-result row — owns the action chip whose label +
 * variant depend on the BE-reported relation_status. Pre-fix every
 * row rendered "Add", which 422'd when the row was already friends
 * or already pending.
 */
function SearchResultRow({
  user,
  actingIds,
  onSend,
  onAccept,
  onCancel,
  labels,
}: {
  user: FriendSearchResult;
  actingIds: Set<number>;
  onSend: (id: number) => void;
  onAccept: (id: number) => void;
  onCancel: (id: number) => void;
  labels: ReturnType<typeof useT>;
}) {
  const name = displayNameOf(user);
  const isActing = actingIds.has(user.id);

  const renderAction = () => {
    if (isActing) {
      return <ActivityIndicator color={Colors.primary} />;
    }
    return renderActionByStatus(user.relation_status, {
      onAdd: () => onSend(user.id),
      onAccept: () => onAccept(user.id),
      onCancel: () => onCancel(user.id),
      labels,
    });
  };

  return (
    <View style={styles.userCard}>
      <AvatarTile uri={user.avatar_url} name={name} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{name}</Text>
        <Text style={styles.userLogin}>@{user.login}</Text>
      </View>
      {renderAction()}
    </View>
  );
}

function renderActionByStatus(
  status: FriendRelationStatus,
  handlers: {
    onAdd: () => void;
    onAccept: () => void;
    onCancel: () => void;
    labels: ReturnType<typeof useT>;
  },
) {
  const { onAdd, onAccept, onCancel, labels } = handlers;
  switch (status) {
    case 'accepted':
      // Already friends — no action, just a small pill so the user
      // sees why "Add" is missing.
      return (
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{labels.friends.alreadyFriendsBadge}</Text>
        </View>
      );
    case 'outgoing':
      // Cancel-my-pending — sm ghost cyan (matches the Mine-tab
      // outgoing row treatment).
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={labels.friends.cancelBtn}
          style={cancelBtnStyles.btn}
        >
          <Text
            style={cancelBtnStyles.label}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {labels.friends.cancelBtn}
          </Text>
        </TouchableOpacity>
      );
    case 'incoming':
      // Incoming request → Accept reads as solid cyan secondary so
      // the obviously-good action stands out from the row's quiet
      // backdrop.
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onAccept}
          accessibilityRole="button"
          accessibilityLabel={labels.friendRequests.accept}
          style={searchAcceptBtnStyles.btn}
        >
          <Text
            style={searchAcceptBtnStyles.label}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {labels.friendRequests.accept}
          </Text>
        </TouchableOpacity>
      );
    case 'blocked':
      return (
        <View style={[styles.statusPill, styles.statusPillBlocked]}>
          <Text style={styles.statusPillText}>{labels.friends.blockedBadge}</Text>
        </View>
      );
    case 'none':
    default:
      // "Add" CTA on a stranger row — sm solid cyan secondary.
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={labels.friends.addBtn}
          style={addFriendBtnStyles.btn}
        >
          <Text
            style={addFriendBtnStyles.label}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {labels.friends.addBtn}
          </Text>
        </TouchableOpacity>
      );
  }
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
  requestsBannerSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
    marginTop: 2,
  },
  outgoingWrap: {
    marginBottom: 4,
  },
  outgoingTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#8B95A8',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 14,
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
  // Lucide-icon fallback when avatar_url is empty or fails to load.
  // Same dimensions as the real avatar so the row layout doesn't
  // shift when the URL resolves vs. fails.
  avatarFallback: {
    backgroundColor: '#1F2533',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Wrapper around the avatar so the "currently playing" pulse dot
  // can absolute-position onto the bottom-right corner without
  // moving the avatar itself in the row layout.
  avatarWrap: {
    position: 'relative',
  },
  liveDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#141823',
  },
  userInfo: { flex: 1 },
  userName: { fontFamily: Fonts.inter.semiBold, fontSize: 13.5, color: Colors.text },
  userLogin: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
    marginTop: 2,
  },
  // "Playing PC-04 at Cyberium" line shown in place of @login when
  // the friend has a live session. Green tint matches the dot so the
  // two cues read as a unit.
  userLive: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11.5,
    color: '#22C55E',
    marginTop: 2,
  },
  // Status pills for relation_status states that don't have an
  // actionable button (already friends, blocked).
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusPillBlocked: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusPillText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11,
    color: '#22C55E',
    letterSpacing: 0.3,
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
});

// Inline cancel-pending CTA — sm (38pt) ghost cyan label for both
// the Mine-tab outgoing-row cancel AND the Search-tab outgoing
// cancel. Same shape so the action reads consistently across the
// screen's two tabs.
const cancelBtnStyles = StyleSheet.create({
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

// Inline remove-friend ghost cyan. Identical visual to cancel — the
// confirm dialog upstream makes the destructive nature explicit, so
// the inline affordance stays quiet.
const removeBtnStyles = StyleSheet.create({
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

// Inline search-tab incoming-accept — sm solid cyan secondary.
const searchAcceptBtnStyles = StyleSheet.create({
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

// Inline search-tab Add — sm solid cyan secondary. Same shape as
// accept (a "yes, add this user" affordance) so the user sees a
// consistent affirmative-action chip across the screen.
const addFriendBtnStyles = StyleSheet.create({
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

// Inline retry CTA on the load-error empty card — sm primary
// gradient so the recovery action stands out without crowding the
// error message above.
const retryBtnStyles = StyleSheet.create({
  btn: { height: 38, borderRadius: 999, overflow: 'hidden' },
  fill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    minWidth: 80,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
