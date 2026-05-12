import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { Images } from '../constants/Images';
import BackIcon from '../components/icons/BackIcon';
import AttachmentIcon from '../components/icons/AttachmentIcon';
import SmileyIcon from '../components/icons/SmileyIcon';
import SendIcon from '../components/icons/SendIcon';
import ThumbsUpIcon from '../components/icons/ThumbsUpIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import KeyboardSafeView from '../components/common/KeyboardSafeView';
import * as teamsApi from '../lib/api/services/teams';

interface LocalMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: string;
  reactions?: number;
  self?: boolean;
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
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ teamId?: string; teamName?: string }>();
  const teamId = params.teamId ? Number(params.teamId) : null;
  const teamName = params.teamName || '—';
  const scrollRef = useRef<ScrollView | null>(null);

  const [tab, setTab] = useState('Chat');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const TABS = [
    { id: 'Chat', label: t.teamChat.tabChat },
    { id: 'Members', label: t.teamChat.tabMembers },
    { id: 'Settings', label: t.teamChat.tabSettings },
  ];

  const adapt = (m: teamsApi.ChatMessage): LocalMessage => ({
    id: String(m.id),
    sender: m.user_name,
    avatar: m.user_avatar_url || Images.avatar,
    text: m.text,
    time: formatMessageTime(m.created_at),
    reactions: m.reactions ? Object.values(m.reactions).reduce((a, b) => a + b, 0) : undefined,
    self: m.is_self,
  });

  useEffect(() => {
    if (!Number.isFinite(teamId) || teamId == null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await teamsApi.listMessages(teamId);
        if (cancelled) return;
        setMessages(data.map(adapt));
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
      } catch (e) {
        if (!cancelled) toast.error(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, toast]);

  const onSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    if (teamId == null) {
      toast.error(t.common.error);
      return;
    }
    setSending(true);
    const optimisticId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        sender: t.teamChat.me ?? 'You',
        avatar: Images.avatar,
        text: trimmed,
        time: formatMessageTime(new Date().toISOString()),
        self: true,
      },
    ]);
    setInput('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    try {
      const real = await teamsApi.sendMessage(teamId, trimmed);
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? adapt(real) : m)));
    } catch (e) {
      toast.error(getErrorMessage(e));
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardSafeView>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <BackIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <Image source={{ uri: Images.avatar }} style={styles.headerAvatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {teamName}
          </Text>
        </View>
        {/* Voice / dial buttons removed until the SFU integration ships
            — pre-fix they were dead taps that suggested working voice
            comms users couldn't actually use. */}
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((tb) => {
          const isActive = tab === tb.id;
          return (
            <Pressable
              key={tb.id}
              style={styles.tab}
              onPress={() => setTab(tb.id)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tb.label}</Text>
              {isActive && <View style={styles.tabUnderline} />}
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.chatScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Members + Settings tabs are coming-soon placeholders —
            both screens need new BE endpoints (member list w/ roles,
            team settings mutate) that don't exist yet. Pre-fix the
            tabs rendered identical Chat content, which made the tab
            row read as broken (audit MED). */}
        {tab !== 'Chat' ? (
          <View style={styles.tabSoon}>
            <Text style={styles.tabSoonText}>
              {tab === 'Members'
                ? t.teamChat.membersSoon
                : t.teamChat.settingsSoon}
            </Text>
          </View>
        ) : loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : messages.length === 0 ? (
          <Text style={styles.systemMessage}>{t.teamChat.emptyChat ?? ''}</Text>
        ) : (
          messages.map((m) => {
            if (m.self) {
              return (
                <View key={m.id} style={styles.selfWrap}>
                  <View style={styles.selfBubble}>
                    <Text style={styles.selfText}>{m.text}</Text>
                  </View>
                  <Text style={styles.timeRight}>{m.time}</Text>
                </View>
              );
            }
            return (
              <View key={m.id} style={styles.msgRow}>
                <Image source={{ uri: m.avatar }} style={styles.msgAvatar} />
                <View style={styles.msgContent}>
                  <View style={styles.msgHeader}>
                    <Text style={styles.msgSender}>{m.sender}</Text>
                    <Text style={styles.msgTime}>{m.time}</Text>
                  </View>
                  <View style={styles.msgBubble}>
                    <Text style={styles.msgText}>{m.text}</Text>
                  </View>
                  {m.reactions ? (
                    <View style={styles.reactionRow}>
                      <View style={styles.reactionPill}>
                        <ThumbsUpIcon size={11} color="#00CFFF" />
                        <Text style={styles.reactionCount}>{m.reactions}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

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
        {/* Attachment + smiley buttons rely on future image-picker /
            emoji-keyboard integrations. Visible but no-op for now —
            tapping toasts the "coming soon" copy so users know we
            know. The Send button below is fully wired. */}
        <TouchableOpacity
          hitSlop={8}
          style={styles.inputAction}
          onPress={() => toast.info(t.settings.comingSoon)}
        >
          <AttachmentIcon size={20} color="#8B95A8" />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={8}
          style={styles.inputAction}
          onPress={() => toast.info(t.settings.comingSoon)}
        >
          <SmileyIcon size={20} color="#8B95A8" />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={8}
          style={styles.sendAction}
          onPress={onSend}
          disabled={sending || input.trim().length === 0}
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
      </KeyboardSafeView>
    </SafeAreaView>
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
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22C55E',
  },
  headerStatus: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11,
    color: '#22C55E',
  },
  headerLobby: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
    marginTop: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#141823',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  chatScroll: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 14,
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
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1F2533',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  reactionCount: {
    fontFamily: Fonts.inter.medium,
    fontSize: 10.5,
    color: Colors.text,
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
  tabSoon: {
    marginTop: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  tabSoonText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 19,
  },
  voiceCard: {
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,207,255,0.15)',
    gap: 10,
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceTitle: {},
  voiceLabel: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12.5,
    color: Colors.text,
  },
  voiceBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceLobby: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  voiceCount: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  avatarStack: {
    width: 70,
    height: 24,
    position: 'relative',
  },
  stackAvatar: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#141823',
    top: 1,
  },
  waveformWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 18,
  },
  wavBar: {
    flex: 1,
    backgroundColor: '#00CFFF',
    borderRadius: 1,
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
    height: 42,
    backgroundColor: '#141823',
    borderRadius: 21,
    paddingHorizontal: 16,
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
});
