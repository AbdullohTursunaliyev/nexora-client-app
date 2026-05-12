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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import RobotIcon from '../components/icons/RobotIcon';
import SupportIcon from '../components/icons/SupportIcon';
import PhoneCallIcon from '../components/icons/PhoneCallIcon';
import ShareIcon from '../components/icons/ShareIcon';
import HeadphonesIcon from '../components/icons/HeadphonesIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import SearchIcon from '../components/icons/SearchIcon';
import CloseIcon from '../components/icons/CloseIcon';
import Button from '../components/common/Button';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import KeyboardSafeView from '../components/common/KeyboardSafeView';
import * as supportApi from '../lib/api/services/support';
import { getErrorMessage } from '../lib/api/client';

type IconCmp = React.ComponentType<{ size?: number; color?: string }>;

// Single phone number for "Call support" — placeholder until per-tenant
// support phone lands on the BE. Keeping it visible (rather than
// dialling nothing) is the lesser harm.
const SUPPORT_PHONE = '+998712005050';

// Form modes drive which copy + API method the inline ticket modal
// uses. Both call BE endpoints that already exist on the API — the
// previous "coming soon" toast was leftover from before this wiring.
type TicketMode = 'submit' | 'remote';

export default function HelpSupportScreen() {
  const t = useT();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // Ticket modal state. We share a single modal for both "Submit
  // ticket" and "Remote help" — same form shape, different BE call.
  const [ticketMode, setTicketMode] = useState<TicketMode | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  const openSupportChat = () => {
    // Pre-launch: the AI assistant is soon-gated and live operator
    // chat isn't built yet, so the "chat with support" CTA falls
    // through to the ticket submit modal. The user types their
    // question once → it lands in the operator queue and we reply
    // when staff is available. Restore the /ai-assistant push when
    // the AI screen swaps its placeholder for the live chat UI.
    submitTicket();
  };

  const callSupport = async () => {
    const url = `tel:${SUPPORT_PHONE}`;
    const can = await Linking.canOpenURL(url).catch(() => false);
    if (can) {
      void Linking.openURL(url);
    } else {
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
    // Prefill subject + message so the user just needs to add detail
    // — the "remote help" intent already tells operators what's
    // wanted, the message is for context.
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
        // Remote-help intent maps to `reportIssue` of type=tech — the
        // BE forwards this to the tenant's operator dashboard with a
        // "needs remote help" tag.
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

  const openTopic = (label: string) => {
    // Pre-launch: the AI assistant is soon-gated. We fall back to
    // opening the submit-ticket modal pre-filled with the topic
    // title so the user can ask staff directly. Restore the
    // /ai-assistant deep-link when the live chat UI ships.
    setTicketMode('submit');
    setTicketSubject(label);
    setTicketMessage('');
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

  const TOPICS = [
    { id: '1', label: t.helpSupport.topic1 },
    { id: '2', label: t.helpSupport.topic2 },
    { id: '3', label: t.helpSupport.topic3 },
  ];


  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom']}>
      <KeyboardSafeView>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.helpSupport.headerTitle}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
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
              onSubmitEditing={() => {
                const q = searchQuery.trim();
                if (q.length === 0) return;
                // AI assistant soon-gated — fall through to the
                // submit-ticket modal with the query as the subject.
                // Restore the /ai-assistant deep-link when the live
                // chat UI ships.
                setTicketMode('submit');
                setTicketSubject(q);
                setTicketMessage('');
              }}
            />
            <View style={styles.searchIcon}>
              <SearchIcon size={16} color="#8B95A8" />
            </View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>{t.helpSupport.quickActions}</Text>

        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map(({ id, title, subtitle, Icon, color, onPress }) => (
            <TouchableOpacity
              key={id}
              style={styles.actionCard}
              activeOpacity={0.85}
              onPress={onPress}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${color}1F` }]}>
                <Icon size={20} color={color} />
              </View>
              <Text style={styles.actionTitle}>{title}</Text>
              <Text style={styles.actionSubtitle}>{subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t.helpSupport.popularTopics}</Text>

        {TOPICS.map((tp) => (
          <TouchableOpacity
            key={tp.id}
            style={styles.topicRow}
            activeOpacity={0.7}
            onPress={() => openTopic(tp.label)}
          >
            <Text style={styles.topicLabel}>{tp.label}</Text>
            <ChevronRightIcon size={16} color="#8B95A8" />
          </TouchableOpacity>
        ))}

        {/* "View all" link removed pre-launch — it used to push
            to /ai-assistant which is now soon-gated. The popular
            topics list above already covers the most common
            questions, and the Submit/Call/Remote actions below let
            users escalate to staff when needed. */}
      </ScrollView>
      </KeyboardSafeView>

      {/* Submit-ticket / remote-help modal. Single modal serves both
          intents — copy + which BE method to call is driven by
          `ticketMode`. */}
      <Modal
        visible={ticketMode !== null}
        transparent
        animationType="slide"
        onRequestClose={closeTicketModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeTicketModal}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
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
            />

            <View style={styles.modalFooter}>
              <Button
                label={t.helpSupport.ticketSendBtn}
                variant="primary"
                size="lg"
                fullWidth
                loading={ticketSubmitting}
                disabled={ticketSubmitting || ticketMessage.trim().length === 0}
                onPress={sendTicket}
              />
            </View>
            {ticketSubmitting && (
              <ActivityIndicator
                color={Colors.primary}
                style={{ marginTop: 8 }}
                size="small"
              />
            )}
          </Pressable>
        </Pressable>
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
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141823',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  topicLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: Colors.text,
  },
  viewAll: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#00CFFF',
  },
  // Ticket / remote-help modal — bottom sheet pattern. Backdrop is a
  // pressable that closes on outer-tap; the sheet itself stops
  // propagation so taps inside don't accidentally dismiss.
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#141823',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
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
