import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { Images } from '../constants/Images';
import SimpleHeader from '../components/common/SimpleHeader';
import PlusIcon from '../components/icons/PlusIcon';
import LightningIcon from '../components/icons/LightningIcon';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import SwitchIcon from '../components/icons/SwitchIcon';
import StopIcon from '../components/icons/StopIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import GamepadIcon from '../components/icons/GamepadIcon';
import StaffIcon from '../components/icons/StaffIcon';
import MessageCircleIcon from '../components/icons/MessageCircleIcon';
import SettingsIcon from '../components/icons/SettingsIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import * as pcsApi from '../lib/api/services/pcs';
import { getErrorMessage } from '../lib/api/client';
import type { Pc } from '../lib/api/types';
import { useDialog } from '../components/common/AppDialog';
import { useAuth } from '../store/AuthProvider';

const pad = (n: number) => String(n).padStart(2, '0');

type IconCmp = React.ComponentType<{ size?: number; color?: string }>;

export default function ActiveSessionScreen() {
  const t = useT();
  const toast = useToast();
  const dialog = useDialog();
  const { clubs, currentTenantId } = useAuth();
  const activeMembership = clubs.find((c) => c.tenant_id === currentTenantId) ?? null;
  const myClientId = activeMembership?.client_id ?? null;
  // Pre-fix this was seeded to `72 * 60 + 45` (4365s) — every user
  // entering active-session saw "01:12:45" as elapsed time even when
  // they'd just booked a second ago. We now compute from the BE PC's
  // booking.reserved_from (proxy for session start when the catalog
  // doesn't expose Session.started_at) and only tick once we've
  // confirmed the PC is actually 'busy'.
  const [seconds, setSeconds] = useState(0);
  const [activePc, setActivePc] = useState<Pc | null>(null);
  // Tracks whether the first poll has completed so the empty state
  // doesn't flash on mount.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [ending, setEnding] = useState(false);

  // 1Hz timer + 30s PC poll — both pause when the app is backgrounded
  // so we don't drain battery / waste network on a screen the user
  // isn't looking at (FE-H7). They resume on foreground.
  const isForeground = useRef(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      isForeground.current = state === 'active';
    });
    return () => sub.remove();
  }, []);

  // Only tick the elapsed timer when the PC is actually 'busy'. For
  // 'booked' status (reservation placed, session not started yet) the
  // counter freezes — ticking 00:00:01 ... when no session exists is
  // misleading copy.
  const isLive = activePc?.status === 'busy';

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => {
      if (isForeground.current) setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isLive]);

  // Pull the user's currently-busy PC from the backend. Polls every 30s so the
  // session card stays fresh (e.g. if staff updates status remotely).
  // When we find the user's PC we also seed `seconds` from its
  // `booking.reserved_from` so the elapsed timer reflects reality, not
  // a hardcoded 72-minute fixture.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isForeground.current) return;
      try {
        const list = await pcsApi.listPcs();
        if (cancelled) return;
        // Pre-fix this was `list.find((p) => p.status === 'busy' || p.status === 'reserved')`
        // which had two bugs: (1) 'reserved' is never returned by the
        // BE — it's 'booked'; (2) status-only matching surfaced a
        // STRANGER's busy PC the moment any other user in the tenant
        // started a session. The new helper filters by booking.is_mine
        // so a multi-user club shows the caller their own seat.
        const mine = pcsApi.findMyPc(list, myClientId);
        if (mine) {
          setActivePc(mine);
          // Seed elapsed seconds from the booking's reserved_from
          // (BE doesn't expose Session.started_at on the catalog —
          // reserved_from is the closest proxy we have). Only seed
          // once: re-seeding on every poll would freeze the visible
          // timer on each 30s tick.
          const startedAtRaw = mine.booking?.reserved_from ?? null;
          if (startedAtRaw && mine.status === 'busy') {
            const startedMs = Date.parse(startedAtRaw);
            if (Number.isFinite(startedMs)) {
              const elapsedSec = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
              setSeconds((curr) => (curr === 0 ? elapsedSec : curr));
            }
          }
        } else {
          // Explicit reset — pre-fix the screen retained the last
          // PC state forever once seen. Now a clean poll with no
          // match drops the stale row so the empty state renders.
          setActivePc(null);
        }
      } catch {
        // Silent — UI keeps the last-known PC visible if offline.
      } finally {
        if (!cancelled) setHasLoadedOnce(true);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [myClientId]);

  const onEndSession = async () => {
    if (!activePc) {
      router.replace('/(tabs)');
      return;
    }
    const ok = await dialog.confirm({
      title: t.activeSession.endSession,
      confirmLabel: t.bookingExit.confirm,
      cancelLabel: t.bookingExit.cancel,
      destructive: true,
    });
    if (!ok) return;
    setEnding(true);
    try {
      await pcsApi.unbookPc(activePc.id);
      router.replace('/(tabs)');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setEnding(false);
    }
  };

  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  // For 'booked' status the session hasn't started yet — render '—'
  // for elapsed instead of "00:00:00" ticking, so the user understands
  // they're still in the pre-session window.
  const elapsed = isLive ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : '—';
  // Show '—' while we haven't located the user's busy PC instead of
  // pretending it's "PC-07" for every user.
  const pcLabel = activePc?.code ?? '—';

  // Real club name + cover come from the active membership. We fall
  // back to an empty string (rendered as a dash by the UI) rather than
  // the hardcoded "Nexora Arena Koramangala" the demo originally used.
  const clubName = activeMembership?.tenant_name ?? '';
  const clubLogo = activeMembership?.club_logo ?? '';

  // Start time is derived from the booking's reserved_from (closest
  // proxy: the BE catalog doesn't expose Session.started_at). Falls
  // back to a dash when no booking is known yet.
  const startTimeLabel = (() => {
    const startedAtRaw = activePc?.booking?.reserved_from ?? null;
    if (!startedAtRaw) return '—';
    const d = new Date(startedAtRaw);
    if (Number.isNaN(d.getTime())) return '—';
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  // "Awaiting confirmation" empty state — shown when the first poll
  // completed but didn't find any PC owned by this user. Common
  // scenarios:
  //   - User scanned a QR but their PcBooking just expired (reserved
  //     window ran out before they got to the seat)
  //   - QR scan was accepted by the BE but the operator hasn't
  //     transitioned the booking → session yet, AND the booking row
  //     was cleaned up by a cron in between
  //   - User landed here without a booking at all (deep link / nav
  //     edge case)
  // Pre-fix the screen silently picked a stranger's busy PC and
  // showed a misleading elapsed timer. The empty state is the honest
  // signal that something needs human resolution.
  const showAwaiting = hasLoadedOnce && !activePc;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={t.activeSession.headerTitle} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.clubCard}>
          <Image
            source={{ uri: clubLogo || Images.clubs[0] }}
            style={styles.clubImage}
          />
          <View style={styles.clubInfo}>
            <Text style={styles.clubName} numberOfLines={2}>
              {clubName || '—'}
            </Text>
            <View style={styles.clubMeta}>
              <View style={styles.openWrap}>
                <View style={styles.openDot} />
                <Text style={styles.openText}>{t.activeSession.open}</Text>
              </View>
              {/* Per-club rating chip removed: ClubMembership doesn't
                  carry rating. The hardcoded "4.8" was the same for
                  every active session and misled users. */}
            </View>
          </View>
        </View>

        {/* Awaiting-confirmation banner — shown when a poll has
            completed but no PC was matched to this user. Sits at the
            top of the body so it's the first thing the user reads,
            not buried below the stats. The "—" PC label still renders
            below so the layout doesn't reshape; the banner is the
            primary signal. */}
        {showAwaiting && (
          <View style={styles.awaitingCard}>
            <Text style={styles.awaitingTitle}>{t.activeSession.awaitingTitle}</Text>
            <Text style={styles.awaitingSub}>{t.activeSession.awaitingSub}</Text>
          </View>
        )}

        {/* "Booked but not live yet" banner — shown when we DID find
            the user's PC but it's still in pre-session state. Distinct
            from the awaiting banner above (which means "no PC found
            at all"); this one means "your reservation is real, but
            the session hasn't been started by staff yet". */}
        {activePc && !isLive && (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>{t.activeSession.pendingTitle}</Text>
            <Text style={styles.pendingSub}>{t.activeSession.pendingSub}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>{t.activeSession.pcLabel}</Text>
        <View style={styles.pcRow}>
          <Text style={styles.pcId}>{pcLabel}</Text>
          <View style={styles.zoneBadge}>
            <GamepadIcon size={12} color="#A78BFA" />
            <Text style={styles.zoneBadgeText}>{t.activeSession.zoneBadge}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t.activeSession.startTime}</Text>
            <Text style={styles.statValue}>{startTimeLabel}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t.activeSession.elapsed}</Text>
            <Text style={[styles.statValue, { color: '#00CFFF' }]}>{elapsed}</Text>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.balanceLabel}>{t.activeSession.balanceLabel}</Text>
            <Text style={styles.balanceValue}>
              {(activeMembership?.balance ?? 0).toLocaleString('ru-RU').replace(/,/g, ' ')} {t.common.currencyUnit}
            </Text>
          </View>
          {/* Top-up `+` button hidden pre-launch — wallet-topup is
              soon-gated until the PSP webhook → balance credit
              pipeline is wired end-to-end. Users top up at the club
              till for now. Restore the TouchableOpacity → '/wallet-topup'
              when PSP lands. */}
        </View>

        <Text style={styles.sectionTitle}>{t.activeSession.quickActions}</Text>

        <ActionRow
          Icon={LightningIcon}
          color="#F59E0B"
          label={t.activeSession.extend}
          onPress={() => router.push('/zone-switch')}
        />
        {/* "Add balance" action hidden — same wallet-topup soon
            gate as the `+` button above. */}
        <ActionRow
          Icon={SwitchIcon}
          color="#7C3AED"
          label={t.activeSession.switchZone}
          onPress={() => router.push('/zone-switch')}
        />
        <ActionRow
          Icon={StopIcon}
          color="#EF4444"
          label={t.activeSession.endSession}
          onPress={onEndSession}
          danger
        />
      </ScrollView>

      <View style={styles.subTabs}>
        <SubTab label={t.activeSession.tabSession} Icon={GamepadIcon} active />
        <SubTab label={t.activeSession.tabServices} Icon={StaffIcon} onPress={() => router.push('/services')} />
        {/* Chat + Settings sub-tabs are placeholders for features that
            aren't end-to-end yet (audit MED — pre-fix they had no
            onPress at all, so the bottom nav was 2 cyan tabs + 2 dead
            ones). Tap surfaces a "coming soon" toast so the user
            knows the slot is reserved, not broken. */}
        <SubTab
          label={t.activeSession.tabChat}
          Icon={MessageCircleIcon}
          onPress={() => toast.error(t.common.comingSoon)}
        />
        <SubTab
          label={t.activeSession.tabSettings}
          Icon={SettingsIcon}
          onPress={() => toast.error(t.common.comingSoon)}
        />
      </View>
    </SafeAreaView>
  );
}

interface ActionProps {
  Icon: IconCmp;
  color: string;
  label: string;
  onPress?: () => void;
  danger?: boolean;
}

function ActionRow({ Icon, color, label, onPress, danger }: ActionProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.actionRow, danger && styles.actionRowDanger]}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${color}1F` }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={[styles.actionLabel, danger && { color: '#EF4444' }]}>{label}</Text>
      <ChevronRightIcon size={16} color={danger ? '#EF4444' : '#8B95A8'} />
    </TouchableOpacity>
  );
}

interface SubTabProps {
  label: string;
  Icon: IconCmp;
  active?: boolean;
  onPress?: () => void;
}

function SubTab({ label, Icon, active, onPress }: SubTabProps) {
  const color = active ? '#00CFFF' : '#8B95A8';
  return (
    <TouchableOpacity onPress={onPress} style={styles.subTab} activeOpacity={0.7}>
      <Icon size={18} color={color} />
      <Text style={[styles.subTabText, active && styles.subTabTextActive]}>{label}</Text>
      {active && <View style={styles.subTabIndicator} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  clubImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  clubInfo: {
    flex: 1,
    gap: 6,
  },
  clubName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
    lineHeight: 18,
  },
  clubMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  openWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  openText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11.5,
    color: '#22C55E',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12,
    color: Colors.text,
  },
  // Awaiting-confirmation banner — amber-tinted to read as a soft
  // attention prompt (not destructive red). Sits above the PC label
  // so it's the first thing the user reads when no PC matched.
  awaitingCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  awaitingTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: '#F59E0B',
  },
  awaitingSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#C7CAD1',
    lineHeight: 18,
  },
  // "Booked but not live yet" banner — cyan, matches the brand
  // primary so it reads as informational, not warning.
  pendingCard: {
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.22)',
  },
  pendingTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: '#00CFFF',
  },
  pendingSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#C7CAD1',
    lineHeight: 18,
  },
  sectionLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
    marginTop: 18,
  },
  pcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pcId: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 32,
    color: Colors.text,
    letterSpacing: 1,
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  zoneBadgeText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11.5,
    color: '#A78BFA',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  statLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  statValue: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  balanceLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
  },
  balanceValue: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.text,
    marginTop: 2,
  },
  plusBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 22,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  actionRowDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontFamily: Fonts.inter.medium,
    fontSize: 13.5,
    color: Colors.text,
  },
  subTabs: {
    flexDirection: 'row',
    backgroundColor: '#141823',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    paddingVertical: 4,
  },
  subTabText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11,
    color: '#8B95A8',
  },
  subTabTextActive: {
    color: '#00CFFF',
    fontFamily: Fonts.inter.semiBold,
  },
  subTabIndicator: {
    position: 'absolute',
    bottom: -10,
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#00CFFF',
  },
});
