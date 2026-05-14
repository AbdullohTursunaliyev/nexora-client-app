import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { MoreVertical, User, LogOut, Trash2 } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import BackIcon from '../components/icons/BackIcon';
import AttachmentIcon from '../components/icons/AttachmentIcon';
import SmileyIcon from '../components/icons/SmileyIcon';
import SendIcon from '../components/icons/SendIcon';
import ThumbsUpIcon from '../components/icons/ThumbsUpIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { useDialog } from '../components/common/AppDialog';
import { getErrorMessage } from '../lib/api/client';
import KeyboardSafeView from '../components/common/KeyboardSafeView';
import * as teamsApi from '../lib/api/services/teams';

const PAGE_SIZE = 50;
const REACTION_EMOJI_DEFAULT = '👍';

/**
 * Quick-reaction palette — shown when the user long-presses a
 * message. Mirrors Telegram's Reactions row (👍 ❤️ 😂 🎉 😢 🔥)
 * which covers the 80% of emoji intent users actually pick.
 * Tap any one → POSTs that emoji as a reaction.
 *
 * BE accepts ANY string (validated as a string up to 16 chars), so
 * extending the palette is a pure-FE change — no schema work.
 */
const REACTION_PALETTE = ['👍', '❤️', '😂', '🎉', '😢', '🔥'] as const;

/**
 * Local message shape — extends the BE `ChatMessage` with a stable
 * client-generated id for optimistic-pending messages that haven't
 * received their BE id yet. Pre-fix this used `pending-${Date.now()}`
 * which collided when two messages were sent within the same ms
 * (rare, but reproducible by mashing the send button).
 */
interface LocalMessage extends teamsApi.ChatMessage {
  /** Local-only marker for messages still in-flight. */
  pending?: boolean;
}

let pendingCounter = 0;
function nextPendingId(): number {
  pendingCounter += 1;
  // Negative numeric ids never collide with BE-assigned positives —
  // and the typed `number` field stays consistent across optimistic
  // and confirmed messages (was a string for pending, number for
  // real, which forced `string | number` types upstream).
  return -1 * pendingCounter;
}

function formatMessageTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TeamChatScreen() {
  const t = useT();
  const toast = useToast();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ teamId?: string; teamName?: string }>();
  const teamId = params.teamId ? Number(params.teamId) : null;
  const teamName = params.teamName || '—';
  const scrollRef = useRef<ScrollView | null>(null);

  // Active tab — Chat is the primary, Members is now alive (was
  // a dead "Soon" placeholder before BE-side `members` endpoint
  // landed).
  const [tab, setTab] = useState<'chat' | 'members'>('chat');

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Members tab state — lazy-loaded the first time the user opens
  // the tab so we don't waste a round-trip for users who only
  // ever chat.
  const [members, setMembers] = useState<teamsApi.TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);
  // Pagination state — once we've fetched a page smaller than
  // PAGE_SIZE we know there's nothing older. Prevents pointless
  // round-trips on every scroll-up gesture after the top.
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // Reaction lock keyed by message id — same actingIds pattern we
  // use elsewhere, prevents double-fire when the user mashes a
  // reaction emoji.
  const [reactingIds, setReactingIds] = useState<Set<number>>(new Set());
  // Long-press emoji sheet — open with the message id whose reaction
  // bar should be shown. `null` = closed.
  const [emojiSheetForMessage, setEmojiSheetForMessage] = useState<number | null>(null);
  // Header action sheet — Leave / Disband.
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  // Track whether the current user is the team owner so we can
  // pick the right action label (Leave vs Disband). Hydrated from
  // the members list — falls back to `false` until the list loads
  // (worst case: user sees "Leave", taps it, BE 422s with an
  // actionable hint).
  const isOwner = useMemo(
    () => members.some((m) => m.is_self && m.role === 'owner'),
    [members],
  );

  /**
   * Single load — fetches the most recent page from the BE. Used
   * for initial mount AND pull-to-refresh (passes `false` to
   * `prependOlder`, replacing the list rather than prepending).
   */
  const loadLatest = useCallback(async () => {
    if (teamId == null) return;
    const data = await teamsApi.listMessages(teamId, { limit: PAGE_SIZE });
    setMessages(data);
    setHasMoreOlder(data.length >= PAGE_SIZE);
  }, [teamId]);

  /**
   * Load-older — invoked when the user scrolls near the TOP of the
   * list. Cursor is the smallest id we already have (`before_id`).
   * Prepends the new batch to the front of the array. We use the
   * BE-supported cursor pagination so this works for any chat
   * length, not just <50.
   *
   * Pre-fix the FE didn't paginate at all — the BE returned the
   * latest 50 (after BE-H5 fix) but the FE never asked for older
   * pages. Anything before message #50 was unreachable for the
   * user.
   */
  const loadOlder = useCallback(async () => {
    if (teamId == null) return;
    if (loadingOlder || !hasMoreOlder) return;
    // Find the first BE-confirmed message (id > 0). Pre-fix this
    // read `messages[0]` and gated on `id <= 0` — which works
    // 99% of the time because confirmed messages prepend in
    // chronological order, but breaks if any rendering / sort
    // change ever puts a pending negative-id message at index 0
    // while a real message sits below it. Walking the array for
    // the first id > 0 is robust to that. Audit M3.
    const oldest = messages.find((m) => Number.isFinite(m.id) && m.id > 0);
    if (!oldest) {
      // No real (BE-assigned) messages yet → nothing to anchor on.
      return;
    }
    setLoadingOlder(true);
    try {
      const data = await teamsApi.listMessages(teamId, {
        beforeId: oldest.id,
        limit: PAGE_SIZE,
      });
      if (data.length === 0) {
        setHasMoreOlder(false);
        return;
      }
      setHasMoreOlder(data.length >= PAGE_SIZE);
      // Prepend to the front; BE returns chronologically inside the
      // window so concatenation is straightforward.
      setMessages((prev) => [...data, ...prev]);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoadingOlder(false);
    }
  }, [teamId, loadingOlder, hasMoreOlder, messages, toast]);

  // Initial mount load. Cancellation guard so a fast back-tap
  // doesn't setState on an unmounted screen.
  useEffect(() => {
    if (teamId == null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await loadLatest();
        if (!cancelled) {
          requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
        }
      } catch (e) {
        if (!cancelled) toast.error(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, loadLatest, toast]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadLatest();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * onScroll — when the user pulls the scroll near the TOP of the
   * list (offset ≤ 80pt), trigger an older-page load. The threshold
   * is intentionally generous: with a small chat (1 page), the user
   * naturally bounces at the top and we don't want to fire the
   * fetch on every micro-bounce.
   */
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (y < 80 && hasMoreOlder && !loadingOlder) {
        void loadOlder();
      }
    },
    [hasMoreOlder, loadingOlder, loadOlder],
  );

  const onSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    if (teamId == null) {
      toast.error(t.common.error);
      return;
    }
    setSending(true);
    const optimisticId = nextPendingId();
    const nowIso = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        team_id: teamId,
        user_id: -1,
        user_name: t.teamChat.me ?? 'You',
        user_avatar_url: undefined,
        text: trimmed,
        created_at: nowIso,
        is_self: true,
        pending: true,
      },
    ]);
    setInput('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    try {
      const real = await teamsApi.sendMessage(teamId, trimmed);
      // Explicitly set `my_reactions: []` on the swapped-in real
      // message. The BE returns the new message without a
      // `my_reactions` field (mirrors the list endpoint shape) but
      // the optimistic reaction handler reads `m.my_reactions ?? []`
      // on every tap — fine for the happy path. The edge case the
      // audit caught (M2) is when a reaction round-trip FAILS: the
      // rollback filter then reads `(m.my_reactions ?? []).filter(...)`
      // which is `[]` instead of the real prior server state.
      // Initialising to `[]` here makes every downstream reaction
      // path operate on a defined array, so rollback logic stays
      // consistent.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? { ...real, my_reactions: real.my_reactions ?? [] } : m,
        ),
      );
    } catch (e) {
      toast.error(getErrorMessage(e));
      // Roll back the optimistic insert AND restore the unsent text
      // so the user doesn't lose their message if the network blips.
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  /**
   * Apply a specific emoji reaction to a message. Optimistic UI
   * bumps the per-emoji count immediately; on BE error we rollback.
   *
   * `emoji` is fully parameterised — the pill-tap path uses the
   * default 👍 (legacy quick-react), while long-press opens the
   * palette sheet which can fire any emoji from REACTION_PALETTE.
   *
   * BE behaviour: `firstOrCreate` is additive — once a user has
   * reacted with a given emoji, repeat taps are no-ops. We still
   * optimistically reflect "added" state and skip the BE call when
   * `my_reactions` already includes the emoji.
   */
  const onReact = useCallback(
    async (messageId: number, emoji: string = REACTION_EMOJI_DEFAULT) => {
      if (teamId == null) return;
      if (messageId <= 0) return; // pending message, can't react yet
      if (reactingIds.has(messageId)) return;

      setReactingIds((prev) => new Set(prev).add(messageId));
      let alreadyMine = false;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const myReactions = m.my_reactions ?? [];
          alreadyMine = myReactions.includes(emoji);
          if (alreadyMine) return m;
          const nextCounts = { ...(m.reactions ?? {}) };
          nextCounts[emoji] = (nextCounts[emoji] ?? 0) + 1;
          return {
            ...m,
            reactions: nextCounts,
            my_reactions: [...myReactions, emoji],
          };
        }),
      );
      if (alreadyMine) {
        setReactingIds((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
        return;
      }

      try {
        await teamsApi.reactToMessage(teamId, messageId, emoji);
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const nextCounts = { ...(m.reactions ?? {}) };
            const current = nextCounts[emoji] ?? 0;
            if (current <= 1) delete nextCounts[emoji];
            else nextCounts[emoji] = current - 1;
            return {
              ...m,
              reactions: nextCounts,
              my_reactions: (m.my_reactions ?? []).filter((e2) => e2 !== emoji),
            };
          }),
        );
        toast.error(getErrorMessage(e));
      } finally {
        setReactingIds((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      }
    },
    [teamId, reactingIds, toast],
  );

  const onLongPressMessage = useCallback((messageId: number) => {
    if (messageId <= 0) return; // pending — wait for BE id first
    setEmojiSheetForMessage(messageId);
  }, []);

  // Auto-load members in the background ALSO on chat-tab mount so
  // we know whether the user is the owner before they tap the
  // action menu. Without this the "..." menu would show "Leave"
  // even for owners (correct label appears only after they switch
  // to the Members tab once).
  useEffect(() => {
    if (teamId == null) return;
    if (membersLoaded || membersLoading) return;
    // Silent load — no spinner, just populates the data so the
    // header menu picks the right label.
    void teamsApi.listTeamMembers(teamId).then(setMembers).then(() => setMembersLoaded(true)).catch(() => {
      // Quiet — we'll retry when the user opens the tab.
    });
  }, [teamId, membersLoaded, membersLoading]);

  const onLeaveTeam = useCallback(async () => {
    if (teamId == null) return;
    const ok = await dialog.confirm({
      title: t.teamChat.leaveConfirmTitle,
      message: t.teamChat.leaveConfirmMessage,
      confirmLabel: t.teamChat.leaveConfirmYes,
      cancelLabel: t.teamChat.leaveConfirmNo,
      destructive: true,
    });
    if (!ok) return;
    try {
      await teamsApi.leaveTeam(teamId);
      toast.info(t.teamChat.leftToast);
      router.back();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [teamId, dialog, toast, t]);

  const onDisbandTeam = useCallback(async () => {
    if (teamId == null) return;
    const ok = await dialog.confirm({
      title: t.teamChat.disbandConfirmTitle,
      message: t.teamChat.disbandConfirmMessage,
      confirmLabel: t.teamChat.disbandConfirmYes,
      cancelLabel: t.teamChat.disbandConfirmNo,
      destructive: true,
    });
    if (!ok) return;
    try {
      await teamsApi.disbandTeam(teamId);
      toast.info(t.teamChat.disbandedToast);
      router.back();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [teamId, dialog, toast, t]);

  const loadMembers = useCallback(
    async (showSpinner = true) => {
      if (teamId == null) return;
      if (showSpinner) setMembersLoading(true);
      try {
        const data = await teamsApi.listTeamMembers(teamId);
        setMembers(data);
        setMembersLoaded(true);
      } catch (e) {
        toast.error(getErrorMessage(e));
      } finally {
        if (showSpinner) setMembersLoading(false);
      }
    },
    [teamId, toast],
  );

  // Lazy-load on first tab switch — initial chat-tab mount doesn't
  // pay the cost, but switching to Members fires the fetch once.
  useEffect(() => {
    if (tab === 'members' && !membersLoaded && !membersLoading) {
      void loadMembers();
    }
  }, [tab, membersLoaded, membersLoading, loadMembers]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardSafeView>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t.common.cancel}
          >
            <BackIcon size={20} color={Colors.text} />
          </TouchableOpacity>
          {/* Team avatar — Lucide User in a tinted square for now.
              Team cover_url support exists at the BE row level but
              isn't wired through the team listing payload yet, so
              there's no URL to use today. */}
          <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
            <User size={18} color="#00CFFF" strokeWidth={1.8} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {teamName}
            </Text>
          </View>
          {/* "..." menu — opens the action sheet with Leave or
              Disband (owner) destructive actions. Voice / dial
              buttons were removed in v2 (SFU integration not
              wired yet); this menu replaces them so the header
              right slot isn't just empty. */}
          <TouchableOpacity
            style={styles.headerMenuBtn}
            activeOpacity={0.7}
            onPress={() => setActionSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t.teamChat.menuA11y}
            hitSlop={8}
          >
            <MoreVertical size={20} color="#8B95A8" />
          </TouchableOpacity>
        </View>

        {/* Tab row — Chat is the primary, Members is the secondary.
            Settings tab removed entirely (its destination is still
            unimplemented; will reappear when team-edit endpoint
            ships). Active tab gets a cyan underline matching the
            rest of the app's tabbed surfaces. */}
        <View style={styles.tabsRow}>
          <Pressable
            style={styles.tab}
            onPress={() => setTab('chat')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'chat' }}
          >
            <Text style={[styles.tabText, tab === 'chat' && styles.tabTextActive]}>
              {t.teamChat.tabChat}
            </Text>
            {tab === 'chat' && <View style={styles.tabUnderline} />}
          </Pressable>
          <Pressable
            style={styles.tab}
            onPress={() => setTab('members')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'members' }}
          >
            <Text style={[styles.tabText, tab === 'members' && styles.tabTextActive]}>
              {t.teamChat.tabMembers}
            </Text>
            {tab === 'members' && <View style={styles.tabUnderline} />}
          </Pressable>
        </View>

        {tab === 'members' ? (
          <ScrollView
            contentContainerStyle={styles.membersScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={membersLoading}
                onRefresh={() => loadMembers()}
                tintColor={Colors.primary}
              />
            }
          >
            {membersLoading && !membersLoaded ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
            ) : members.length === 0 ? (
              <Text style={styles.systemMessage}>{t.teamChat.membersEmpty}</Text>
            ) : (
              members.map((m) => <MemberRow key={m.membership_id} member={m} labels={t} />)
            )}
          </ScrollView>
        ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatScroll}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={64}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {loadingOlder && (
            <View style={styles.olderLoader}>
              <ActivityIndicator color={Colors.primary} size="small" />
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
          ) : messages.length === 0 ? (
            <Text style={styles.systemMessage}>{t.teamChat.emptyChat ?? ''}</Text>
          ) : (
            messages.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                isReacting={reactingIds.has(m.id)}
                onReact={(emoji) => onReact(m.id, emoji)}
                onLongPress={() => onLongPressMessage(m.id)}
              />
            ))
          )}
        </ScrollView>
        )}

        {/* Input row hidden on Members tab — sending a message has
            no destination if the user is browsing the roster, and
            an always-on input below would suggest otherwise. */}
        {tab === 'chat' && (
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            style={styles.input}
            placeholder={t.teamChat.inputPlaceholder}
            placeholderTextColor="#6B7280"
            value={input}
            onChangeText={setInput}
            editable={!sending}
            returnKeyType="send"
            onSubmitEditing={onSend}
            multiline
          />
          {/* Attachment + smiley buttons rely on future image-picker
              / emoji-keyboard integrations. Tap toasts "coming soon"
              so the user knows the path is acknowledged. */}
          <TouchableOpacity
            hitSlop={8}
            style={styles.inputAction}
            onPress={() => toast.info(t.settings.comingSoon)}
            accessibilityRole="button"
            accessibilityLabel={t.settings.comingSoon}
          >
            <AttachmentIcon size={20} color="#8B95A8" />
          </TouchableOpacity>
          <TouchableOpacity
            hitSlop={8}
            style={styles.inputAction}
            onPress={() => toast.info(t.settings.comingSoon)}
            accessibilityRole="button"
            accessibilityLabel={t.settings.comingSoon}
          >
            <SmileyIcon size={20} color="#8B95A8" />
          </TouchableOpacity>
          <TouchableOpacity
            hitSlop={8}
            style={styles.sendAction}
            onPress={onSend}
            disabled={sending || input.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel="Send"
          >
            <LinearGradient
              colors={['#00CFFF', '#3B5BF5']}
              style={[
                styles.sendBg,
                (sending || input.trim().length === 0) && { opacity: 0.5 },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <SendIcon size={16} color={Colors.white} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        )}
      </KeyboardSafeView>

      {/* Emoji reaction palette — Telegram-style row of quick-pick
          reactions. Opens on long-press of any message bubble.
          Tapping an emoji fires the same onReact() path as the
          inline pill, so additive-only semantics are consistent
          across both entry points. */}
      <Modal
        visible={emojiSheetForMessage != null}
        transparent
        animationType="fade"
        onRequestClose={() => setEmojiSheetForMessage(null)}
        statusBarTranslucent
      >
        <View style={styles.emojiSheetRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setEmojiSheetForMessage(null)}
          />
          <View style={[styles.emojiSheet, { paddingBottom: Math.max(insets.bottom + 12, 16) }]}>
            <View style={styles.emojiSheetHandle} />
            <View style={styles.emojiRow}>
              {REACTION_PALETTE.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiButton}
                  activeOpacity={0.6}
                  onPress={() => {
                    if (emojiSheetForMessage != null) {
                      void onReact(emojiSheetForMessage, emoji);
                    }
                    setEmojiSheetForMessage(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`React ${emoji}`}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Header action sheet — Leave (member) or Disband (owner)
          destructive action. Both go through `useDialog().confirm`
          so the user explicitly confirms before the BE call. */}
      <Modal
        visible={actionSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setActionSheetOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.actionSheetRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setActionSheetOpen(false)}
          />
          <View
            style={[
              styles.actionSheet,
              { paddingBottom: Math.max(insets.bottom + 12, 16) },
            ]}
          >
            <View style={styles.actionSheetHandle} />
            {isOwner ? (
              <TouchableOpacity
                style={styles.actionSheetRow}
                activeOpacity={0.7}
                onPress={() => {
                  setActionSheetOpen(false);
                  void onDisbandTeam();
                }}
                accessibilityRole="button"
                accessibilityLabel={t.teamChat.disbandAction}
              >
                <Trash2 size={18} color="#EF4444" strokeWidth={1.8} />
                <Text style={[styles.actionSheetLabel, styles.actionSheetLabelDanger]}>
                  {t.teamChat.disbandAction}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionSheetRow}
                activeOpacity={0.7}
                onPress={() => {
                  setActionSheetOpen(false);
                  void onLeaveTeam();
                }}
                accessibilityRole="button"
                accessibilityLabel={t.teamChat.leaveAction}
              >
                <LogOut size={18} color="#EF4444" strokeWidth={1.8} />
                <Text style={[styles.actionSheetLabel, styles.actionSheetLabelDanger]}>
                  {t.teamChat.leaveAction}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * Single message row — owns its avatar fallback flag so a broken
 * URL on one message doesn't poison the next message's render. Also
 * encapsulates the reaction-pill behaviour so the parent screen
 * doesn't accumulate dozens of inline conditionals.
 */
function MessageRow({
  message,
  isReacting,
  onReact,
  onLongPress,
}: {
  message: LocalMessage;
  isReacting: boolean;
  onReact: (emoji: string) => void;
  onLongPress: () => void;
}) {
  const [avatarBroken, setAvatarBroken] = useState(false);
  const showAvatar = !!message.user_avatar_url && !avatarBroken;
  const time = formatMessageTime(message.created_at);

  // Render ALL emojis present on this message, not just 👍. Each
  // gets its own pill with its own count + active-state. Tapping
  // a pill bumps THAT emoji (additive). Long-press the bubble to
  // open the palette and pick a new emoji to add.
  //
  // Pre-fix this only exposed 👍 and showed total reactions
  // (across all emojis) on a thumbs-up icon — so "5 likes + 3
  // hearts" rendered as "8 👍" which is wrong.
  const reactionEntries = Object.entries(message.reactions ?? {}).filter(
    ([, count]) => typeof count === 'number' && count > 0,
  );
  const myReactions = new Set(message.my_reactions ?? []);

  // Self-bubble path — long-press still opens the palette so the
  // user can react to their OWN messages (e.g. emphasising
  // sarcasm). Same UX Telegram offers.
  if (message.is_self) {
    return (
      <View style={styles.selfWrap}>
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={300}
          accessibilityRole="button"
          accessibilityHint="Long press to react"
        >
          <View style={[styles.selfBubble, message.pending && styles.bubblePending]}>
            <Text style={styles.selfText}>{message.text}</Text>
          </View>
        </Pressable>
        {reactionEntries.length > 0 && (
          <View style={styles.reactionRow}>
            {reactionEntries.map(([emoji, count]) => (
              <ReactionPill
                key={emoji}
                emoji={emoji}
                count={count as number}
                active={myReactions.has(emoji)}
                disabled={isReacting || message.id <= 0}
                onPress={() => onReact(emoji)}
              />
            ))}
          </View>
        )}
        <Text style={styles.timeRight}>{time}</Text>
      </View>
    );
  }

  return (
    <View style={styles.msgRow}>
      {showAvatar ? (
        <Image
          source={{ uri: message.user_avatar_url }}
          style={styles.msgAvatar}
          onError={() => setAvatarBroken(true)}
        />
      ) : (
        <View style={[styles.msgAvatar, styles.msgAvatarFallback]}>
          <User size={16} color="#00CFFF" strokeWidth={1.8} />
        </View>
      )}
      <View style={styles.msgContent}>
        <View style={styles.msgHeader}>
          <Text style={styles.msgSender}>{message.user_name}</Text>
          <Text style={styles.msgTime}>{time}</Text>
        </View>
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={300}
          accessibilityRole="button"
          accessibilityHint="Long press to react"
        >
          <View style={styles.msgBubble}>
            <Text style={styles.msgText}>{message.text}</Text>
          </View>
        </Pressable>

        {/* Reaction row — render a pill per emoji that has at least
            one tap. Empty bar (no pills) shows nothing — users open
            the palette via long-press on the bubble. */}
        {reactionEntries.length > 0 && (
          <View style={styles.reactionRow}>
            {reactionEntries.map(([emoji, count]) => (
              <ReactionPill
                key={emoji}
                emoji={emoji}
                count={count as number}
                active={myReactions.has(emoji)}
                disabled={isReacting || message.id <= 0}
                onPress={() => onReact(emoji)}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Single emoji pill. Renders the emoji + count. Active variant
 * (cyan border + tint) indicates the user has reacted with this
 * emoji on this message.
 */
function ReactionPill({
  emoji,
  count,
  active,
  disabled,
  onPress,
}: {
  emoji: string;
  count: number;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  // Special-case the legacy thumbs-up icon glyph for visual
  // continuity — the rest of the app uses the Lucide ThumbsUp icon
  // for "like", not the 👍 emoji glyph. Other emojis render as
  // their Unicode glyphs directly.
  const useLegacyIcon = emoji === '👍';
  return (
    <TouchableOpacity
      style={[styles.reactionPill, active && styles.reactionPillActive]}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {useLegacyIcon ? (
        <ThumbsUpIcon size={11} color={active ? '#00CFFF' : '#8B95A8'} />
      ) : (
        <Text style={styles.reactionEmoji}>{emoji}</Text>
      )}
      <Text style={styles.reactionCount}>{count}</Text>
    </TouchableOpacity>
  );
}

/**
 * Single member row in the Members tab. Owner gets a "Captain"
 * crown badge, regular members no badge, invited members get a
 * dimmed "Invited" label so the user sees the pending state without
 * confusing them with confirmed members.
 */
function MemberRow({
  member,
  labels,
}: {
  member: teamsApi.TeamMember;
  labels: ReturnType<typeof useT>;
}) {
  const [avatarBroken, setAvatarBroken] = useState(false);
  const showAvatar = !!member.avatar_url && !avatarBroken;
  const isInvited = member.role === 'invited';
  const isOwner = member.role === 'owner';
  return (
    <View style={[styles.memberRow, isInvited && styles.memberRowInvited]}>
      {showAvatar ? (
        <Image
          source={{ uri: member.avatar_url ?? undefined }}
          style={styles.memberAvatar}
          onError={() => setAvatarBroken(true)}
        />
      ) : (
        <View style={[styles.memberAvatar, styles.memberAvatarFallback]}>
          <User size={18} color="#00CFFF" strokeWidth={1.8} />
        </View>
      )}
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.name}
            {member.is_self ? ` (${labels.teamChat.you})` : ''}
          </Text>
          {isOwner && (
            <View style={styles.memberOwnerBadge}>
              <Text style={styles.memberOwnerBadgeText}>{labels.teamChat.roleOwner}</Text>
            </View>
          )}
          {isInvited && (
            <View style={styles.memberInvitedBadge}>
              <Text style={styles.memberInvitedBadgeText}>{labels.teamChat.roleInvited}</Text>
            </View>
          )}
        </View>
        <Text style={styles.memberLogin} numberOfLines={1}>
          @{member.login}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarFallback: {
    backgroundColor: '#1F2533',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  chatScroll: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 14,
  },
  olderLoader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  msgRow: {
    flexDirection: 'row',
    gap: 10,
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  msgAvatarFallback: {
    backgroundColor: '#1F2533',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgContent: {
    flex: 1,
    gap: 4,
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  msgSender: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12,
    color: '#00CFFF',
  },
  msgTime: {
    fontFamily: Fonts.inter.regular,
    fontSize: 10.5,
    color: '#6B7280',
  },
  msgBubble: {
    backgroundColor: '#141823',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderTopLeftRadius: 4,
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  msgText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1F2533',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 22,
  },
  reactionPillActive: {
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    borderColor: 'rgba(0, 207, 255, 0.35)',
  },
  reactionEmoji: {
    fontSize: 13,
    lineHeight: 15,
  },
  reactionCount: {
    fontFamily: Fonts.inter.medium,
    fontSize: 10.5,
    color: Colors.text,
  },
  // Emoji palette sheet — slides up on long-press of any bubble.
  emojiSheetRoot: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  emojiSheet: {
    backgroundColor: '#141823',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  emojiSheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A4250',
    alignSelf: 'center',
    marginBottom: 14,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2533',
  },
  emojiText: {
    fontSize: 26,
    lineHeight: 30,
  },
  selfWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  selfBubble: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderTopRightRadius: 4,
    maxWidth: '85%',
  },
  bubblePending: {
    opacity: 0.6,
  },
  selfText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: Colors.white,
    lineHeight: 18,
  },
  timeRight: {
    fontFamily: Fonts.inter.regular,
    fontSize: 10.5,
    color: '#6B7280',
  },
  systemMessage: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: '#141823',
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: Colors.text,
  },
  inputAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendAction: {
    width: 36,
    height: 36,
  },
  sendBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tab row — Chat / Members.
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#8B95A8',
  },
  tabTextActive: {
    color: Colors.text,
    fontFamily: Fonts.inter.semiBold,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 14,
    right: 14,
    height: 2,
    backgroundColor: '#00CFFF',
    borderRadius: 2,
  },
  membersScroll: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  memberRowInvited: {
    opacity: 0.65,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  memberAvatarFallback: {
    backgroundColor: '#1F2533',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
    flexShrink: 1,
  },
  memberLogin: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  memberOwnerBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  memberOwnerBadgeText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 9.5,
    color: '#F59E0B',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  memberInvitedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 149, 168, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(139, 149, 168, 0.35)',
  },
  memberInvitedBadgeText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 9.5,
    color: '#8B95A8',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  // Header "..." action sheet — slides up with Leave or Disband
  // destructive action.
  actionSheetRoot: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#141823',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  actionSheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A4250',
    alignSelf: 'center',
    marginBottom: 14,
  },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  actionSheetLabel: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14.5,
    color: Colors.text,
  },
  actionSheetLabelDanger: {
    color: '#EF4444',
  },
});
