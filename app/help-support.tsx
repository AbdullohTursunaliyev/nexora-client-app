import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Modal,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import RobotIcon from '../components/icons/RobotIcon';
import SupportIcon from '../components/icons/SupportIcon';
import PhoneCallIcon from '../components/icons/PhoneCallIcon';
import ShareIcon from '../components/icons/ShareIcon';
import HeadphonesIcon from '../components/icons/HeadphonesIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import SearchIcon from '../components/icons/SearchIcon';
import CloseIcon from '../components/icons/CloseIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import * as supportApi from '../lib/api/services/support';
import type { HelpTopic } from '../lib/api/services/support';
import { getErrorMessage } from '../lib/api/client';

type IconCmp = React.ComponentType<{ size?: number; color?: string }>;

// Single phone number for "Call support" — placeholder until per-tenant
// support phone lands on the BE. Keeping it visible (rather than
// dialling nothing) is the lesser harm.
const SUPPORT_PHONE = '+998712005050';

// Form modes drive which copy + API method the inline ticket modal
// uses. Both call BE endpoints that already exist on the API.
type TicketMode = 'submit' | 'remote';

// Enable LayoutAnimation on Android (iOS is opt-in by default).
// Used by the FAQ accordion below — pre-Android-13 the experimental
// flag must be flipped per-app before the first LayoutAnimation call,
// otherwise the toggle snaps without animating.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HelpSupportScreen() {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  // FAQ list from BE — pre-fix the screen showed 3 hardcoded topic
  // labels (topic1/2/3) and tapping any of them just opened the
  // ticket-submit modal. Users could neither read an answer nor
  // distinguish between topics. The BE has 8 real Q&A pairs ready
  // (MobileSupportController::helpTopics) — we surface them here as
  // an accordion so the user can read first, escalate second.
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  // Track the currently-expanded question by id so only one answer
  // is visible at a time (mirrors iOS Settings / Android Phone
  // help-screen patterns — keeps the surface compact).
  const [expandedTopicId, setExpandedTopicId] = useState<number | null>(null);

  // Ticket modal state. We share a single modal for both "Submit
  // ticket" and "Remote help" — same form shape, different BE call.
  const [ticketMode, setTicketMode] = useState<TicketMode | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await supportApi.listHelpTopics();
        if (!cancelled) setTopics(Array.isArray(list) ? list : []);
      } catch {
        // Silent — empty state covers the failure case. We don't want
        // a toast on a passive read.
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Client-side filter — `searchQuery` matches the BE-supplied
  // question and answer (case-insensitive). The BE endpoint is
  // public + cheap so re-querying server-side would be wasteful for
  // an 8-row list; in-memory filtering is fine.
  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(
      (tp) =>
        tp.question.toLowerCase().includes(q) ||
        (tp.answer ?? '').toLowerCase().includes(q),
    );
  }, [topics, searchQuery]);

  const toggleTopic = (id: number) => {
    // Smooth height transition on expand/collapse. `easeInEaseOut`
    // matches the default RN Modal slide so the UI feels coherent.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTopicId((curr) => (curr === id ? null : id));
  };

  const openSupportChat = () => {
    // Pre-launch: the AI assistant is soon-gated and live operator
    // chat isn't built yet, so the "chat with support" CTA falls
    // through to the ticket submit modal.
    submitTicket();
  };

  const callSupport = async () => {
    const url = `tel:${SUPPORT_PHONE}`;
    const can = await Linking.canOpenURL(url).catch(() => false);
    if (can) {
      void Linking.openURL(url);
    } else {
      // Tablet / simulator / device without dialler — show the
      // number so the user can copy it manually.
      toast.info(SUPPORT_PHONE);
    }
  };

  const submitTicket = () => {
    setTicketMode('submit');
    setTicketSubject('');
    setTicketMessage('');
  };

  const requestRemoteHelp = () => {
    setTicketMode('remote');
    setTicketSubject(t.helpSupport.actionRemote);
    setTicketMessage('');
  };

  const closeTicketModal = () => {
    if (ticketSubmitting) return;
    setTicketMode(null);
  };

  const sendTicket = async () => {
    const trimmedSubject = ticketSubject.trim();
    const trimmedMessage = ticketMessage.trim();
    if (!trimmedMessage) {
      toast.error(t.helpSupport.ticketErrorEmpty);
      return;
    }
    setTicketSubmitting(true);
    try {
      if (ticketMode === 'submit') {
        await supportApi.submitSupportTicket({
          subject: trimmedSubject || t.helpSupport.actionSubmit,
          message: trimmedMessage,
        });
      } else {
        await supportApi.reportIssue({
          type: 'tech',
          message:
            (trimmedSubject ? `[${trimmedSubject}] ` : '') + trimmedMessage,
        });
      }
      toast.success(t.helpSupport.ticketSuccess);
      setTicketMode(null);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setTicketSubmitting(false);
    }
  };

  const QUICK_ACTIONS: {
    id: string;
    title: string;
    subtitle: string;
    Icon: IconCmp;
    color: string;
    onPress: () => void;
  }[] = [
    { id: '1', title: t.helpSupport.actionChat, subtitle: t.helpSupport.actionChatSub, Icon: SupportIcon, color: '#00CFFF', onPress: openSupportChat },
    { id: '2', title: t.helpSupport.actionCall, subtitle: t.helpSupport.actionCallSub, Icon: PhoneCallIcon, color: '#22C55E', onPress: callSupport },
    { id: '3', title: t.helpSupport.actionSubmit, subtitle: t.helpSupport.actionSubmitSub, Icon: ShareIcon, color: '#7C3AED', onPress: submitTicket },
    { id: '4', title: t.helpSupport.actionRemote, subtitle: t.helpSupport.actionRemoteSub, Icon: HeadphonesIcon, color: '#FF34E0', onPress: requestRemoteHelp },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.helpSupport.headerTitle}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        // Pre-fix the outer view used <KeyboardSafeView> (= a
        // KeyboardAvoidingView wrapper) — but only the search input
        // is inside the screen body, and the modal renders in its
        // own native window where the outer KAV can't reach it
        // anyway. The ticket modal now carries its OWN KAV root, and
        // the search input uses `keyboardShouldPersistTaps` so taps
        // outside dismiss the keyboard naturally.
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#0F1F2E', '#0B0F16']}
          style={styles.heroCard}
        >
          <LinearGradient
            colors={['rgba(0, 207, 255, 0.2)', 'rgba(124, 58, 237, 0.15)', 'transparent']}
            style={styles.heroGlow}
          />
          <View style={styles.aiAvatarWrap}>
            <LinearGradient
              colors={['#00CFFF', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiAvatarRing}
            >
              <View style={styles.aiAvatarInner}>
                <RobotIcon size={48} color="#00CFFF" />
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.aiTitle}>{t.helpSupport.aiTitle}</Text>
          <Text style={styles.aiSubtitle}>{t.helpSupport.aiSubtitle}</Text>

          <View style={styles.searchWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder={t.helpSupport.searchPlaceholder}
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              // Pre-fix Enter on the search input jumped into the
              // ticket-submit modal regardless of intent. Now the
              // input drives the FAQ filter (live, in-memory) — and
              // submitEditing just dismisses the keyboard so the
              // user can read the filtered list.
              // The "still need help" CTA below the list is the
              // explicit ticket-submit path.
            />
            <View style={styles.searchIcon}>
              <SearchIcon size={16} color="#8B95A8" />
            </View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>{t.helpSupport.popularTopics}</Text>

        {/* FAQ accordion — real BE topics replace the 3 hardcoded
            strings that used to live here. Loading + empty + populated
            states all rendered honestly. */}
        {topicsLoading ? (
          <View style={styles.faqLoading}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.faqLoadingText}>
              {t.helpSupport.topicsLoading}
            </Text>
          </View>
        ) : filteredTopics.length === 0 ? (
          <View style={styles.faqEmpty}>
            <Text style={styles.faqEmptyText}>
              {t.helpSupport.topicsEmpty}
            </Text>
          </View>
        ) : (
          filteredTopics.map((tp) => {
            const isOpen = expandedTopicId === tp.id;
            return (
              <View key={tp.id} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  activeOpacity={0.75}
                  onPress={() => toggleTopic(tp.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={tp.question}
                >
                  <Text style={styles.faqQuestion} numberOfLines={isOpen ? 0 : 2}>
                    {tp.question}
                  </Text>
                  {isOpen ? (
                    <ChevronDownIcon size={16} color="#00CFFF" />
                  ) : (
                    <ChevronRightIcon size={16} color="#8B95A8" />
                  )}
                </TouchableOpacity>
                {isOpen && !!tp.answer && (
                  <Text style={styles.faqAnswer}>{tp.answer}</Text>
                )}
              </View>
            );
          })
        )}

        {/* "Still need help?" CTA above the contact actions — sets
            expectations that the buttons below escalate beyond the
            FAQ. Pre-fix this was missing entirely. */}
        <Text style={styles.stillNeedHelp}>
          {t.helpSupport.stillNeedHelp}
        </Text>

        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map(({ id, title, subtitle, Icon, color, onPress }) => (
            <TouchableOpacity
              key={id}
              style={styles.actionCard}
              activeOpacity={0.85}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={title}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${color}1F` }]}>
                <Icon size={20} color={color} />
              </View>
              <Text style={styles.actionTitle}>{title}</Text>
              <Text style={styles.actionSubtitle}>{subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Submit-ticket / remote-help modal.
          LAYOUT NOTES (post-bug-fix):
          1. Pre-fix used `<Pressable backdrop> > <Pressable sheet>` with
             `e.stopPropagation()` — an idiom that doesn't map to RN's
             gesture system, so taps inside the sheet could bubble to
             the backdrop and dismiss the modal mid-typing. Sibling
             layout fixes it (Pressable behind, sheet in front, no
             nesting).
          2. Pre-fix the outer `<KeyboardSafeView>` lived OUTSIDE the
             Modal. React Native renders Modal in its own native
             window on iOS — so the outer KAV did nothing for the
             modal's text inputs, and the iOS keyboard could fully
             cover the message field. The KeyboardAvoidingView is now
             the modal root, lifting the sheet above the keyboard
             on both platforms. */}
      <Modal
        visible={ticketMode !== null}
        transparent
        animationType="slide"
        onRequestClose={closeTicketModal}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.sheetRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeTicketModal}
            accessibilityRole="button"
            accessibilityLabel={t.settings.cancel}
          />
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: Math.max(insets.bottom + 16, 28) },
            ]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>
                {ticketMode === 'remote'
                  ? t.helpSupport.actionRemote
                  : t.helpSupport.actionSubmit}
              </Text>
              <TouchableOpacity
                onPress={closeTicketModal}
                hitSlop={10}
                disabled={ticketSubmitting}
                accessibilityRole="button"
                accessibilityLabel={t.settings.cancel}
              >
                <CloseIcon size={18} color="#8B95A8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>{t.helpSupport.ticketSubtitle}</Text>

            <Text style={styles.modalLabel}>{t.helpSupport.ticketSubject}</Text>
            <TextInput
              style={styles.modalInput}
              value={ticketSubject}
              onChangeText={setTicketSubject}
              placeholder={t.helpSupport.ticketSubjectPlaceholder}
              placeholderTextColor="#6B7280"
              autoCapitalize="sentences"
              editable={!ticketSubmitting}
              maxLength={200}
            />

            <Text style={styles.modalLabel}>{t.helpSupport.ticketMessage}</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={ticketMessage}
              onChangeText={setTicketMessage}
              placeholder={t.helpSupport.ticketMessagePlaceholder}
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={4}
              editable={!ticketSubmitting}
              maxLength={2000}
            />

            <View style={styles.modalFooter}>
              {/* Send-ticket CTA — full-width 52pt pill inside the
                  modal sheet. Disabled until the user types a
                  message (matches the BE's required-message
                  validation so we don't fire a guaranteed 422). */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={sendTicket}
                disabled={ticketSubmitting || ticketMessage.trim().length === 0}
                accessibilityRole="button"
                accessibilityLabel={t.helpSupport.ticketSendBtn}
                accessibilityState={{
                  disabled:
                    ticketSubmitting || ticketMessage.trim().length === 0,
                  busy: ticketSubmitting,
                }}
                style={[
                  sendBtnStyles.btn,
                  (ticketSubmitting || ticketMessage.trim().length === 0) &&
                    sendBtnStyles.btnDisabled,
                ]}
              >
                <LinearGradient
                  colors={['#3B5BF5', '#8B3DF5']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={sendBtnStyles.fill}
                >
                  {ticketSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={sendBtnStyles.label}>
                      {t.helpSupport.ticketSendBtn}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.text,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  aiAvatarWrap: {
    marginBottom: 12,
  },
  aiAvatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
  },
  aiAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: '#0B0F16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
  },
  aiSubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  searchWrap: {
    width: '100%',
    marginTop: 18,
    position: 'relative',
  },
  searchInput: {
    height: 46,
    backgroundColor: 'rgba(20, 24, 35, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingRight: 40,
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: Colors.text,
  },
  searchIcon: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  // FAQ accordion — each question gets a tappable row with a chevron
  // that flips to a down-arrow when expanded. Border + tinted bg on
  // open state nudges the eye to the currently-open answer.
  faqCard: {
    backgroundColor: '#141823',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
    lineHeight: 19,
  },
  faqAnswer: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    lineHeight: 19,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  faqLoading: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  faqLoadingText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
  },
  faqEmpty: {
    backgroundColor: '#141823',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  faqEmptyText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
  },
  stillNeedHelp: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    lineHeight: 18,
    marginTop: 22,
    marginBottom: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48.5%',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  actionSubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#8B95A8',
  },
  // Modal root — sibling-backdrop layout. The KeyboardAvoidingView is
  // the modal root so its `behavior=padding` lifts the sheet above
  // the on-screen keyboard on iOS. Backdrop is a Pressable absolute-
  // fill SIBLING (not parent) of the sheet, so taps inside the sheet
  // don't bubble.
  sheetRoot: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#141823',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A4250',
    marginBottom: 14,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
  },
  modalSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    marginBottom: 8,
  },
  modalLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12,
    color: '#8B95A8',
    marginBottom: 6,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: '#1A1F2B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    color: Colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalInputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  modalFooter: {
    marginTop: 14,
  },
});

// Inline send-ticket CTA styles. 52pt lg pill matches the rhythm of
// the primary submit on login / club-join — same shape because both
// are "final tap to commit work" actions inside a form-shaped surface.
const sendBtnStyles = StyleSheet.create({
  btn: { height: 52, borderRadius: 999, alignSelf: 'stretch', overflow: 'hidden' },
  btnDisabled: { opacity: 0.5 },
  fill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});
