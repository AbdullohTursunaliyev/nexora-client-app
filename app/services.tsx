import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import StaffIcon from '../components/icons/StaffIcon';
import WarningIcon from '../components/icons/WarningIcon';
import SupportIcon from '../components/icons/SupportIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import GamepadIcon from '../components/icons/GamepadIcon';
import MessageCircleIcon from '../components/icons/MessageCircleIcon';
import SettingsIcon from '../components/icons/SettingsIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../store/AuthProvider';
import * as pcsApi from '../lib/api/services/pcs';
import * as supportApi from '../lib/api/services/support';
import { getErrorMessage } from '../lib/api/client';
import type { Pc } from '../lib/api/types';

type IconCmp = React.ComponentType<{ size?: number; color?: string }>;

interface RequestItem {
  id: string;
  title: string;
  subtitle: string;
  Icon: IconCmp;
  iconColor: string;
  iconBg: string;
}

export default function ServicesScreen() {
  const t = useT();
  const toast = useToast();
  const { clubs, currentTenantId } = useAuth();
  const activeMembership = clubs.find((c) => c.tenant_id === currentTenantId) ?? null;

  // Real PC code instead of the hardcoded "PC-07" placeholder
  // (audit HIGH). Polled the same way active-session does — list
  // PCs, find the one owned by the current user.
  const [activePc, setActivePc] = useState<Pc | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const myClientId = activeMembership?.client_id ?? null;
  useEffect(() => {
    let cancelled = false;
    pcsApi
      .listPcs()
      .then((list) => {
        if (cancelled) return;
        // Pre-fix this was `p.status === 'busy' || p.status === 'reserved'`
        // — two bugs there: (1) BE returns 'booked', not 'reserved';
        // (2) status-only matching picked a stranger's PC the moment
        // any concurrent user in the tenant started a session. The
        // shared `findMyPc` helper filters by booking.is_mine so
        // multi-user clubs get the right PC code on the support form.
        setActivePc(pcsApi.findMyPc(list, myClientId));
      })
      .catch(() => {
        // Soft fail — the screen still works, the PC label just stays
        // as the "—" placeholder. The 3 request actions don't need the
        // PC code to function (we include it as context when known).
      });
    return () => {
      cancelled = true;
    };
  }, [myClientId]);

  const pcLabel = activePc?.code ?? '—';

  // Wire the three request rows to real BE endpoints (audit HIGH).
  //   • staff  → callStaff(message) — quick desk-side help
  //   • issue  → reportIssue({type: 'tech', ...}) — broken PC etc.
  //   • support → push to help-support (full ticket form)
  //
  // The first two auto-include the PC code in the message so the
  // operator dashboard knows exactly where the request is from.
  const handleRequest = async (id: 'staff' | 'issue' | 'support') => {
    if (submittingId) return;
    if (id === 'support') {
      router.push('/help-support');
      return;
    }
    setSubmittingId(id);
    try {
      const pcSuffix = activePc?.code ? ` (${activePc.code})` : '';
      if (id === 'staff') {
        await supportApi.callStaff(t.services.staffDefaultMsg + pcSuffix);
        toast.success(t.services.staffSentToast);
      } else {
        await supportApi.reportIssue({
          type: 'tech',
          message: t.services.issueDefaultMsg + pcSuffix,
        });
        toast.success(t.services.issueSentToast);
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmittingId(null);
    }
  };

  const REQUESTS: RequestItem[] = useMemo(
    () => [
      {
        id: 'staff',
        title: t.services.staffTitle,
        subtitle: t.services.staffSub,
        Icon: StaffIcon,
        iconColor: '#00CFFF',
        iconBg: 'rgba(0, 207, 255, 0.14)',
      },
      {
        id: 'issue',
        title: t.services.issueTitle,
        subtitle: t.services.issueSub,
        Icon: WarningIcon,
        iconColor: '#F59E0B',
        iconBg: 'rgba(245, 158, 11, 0.14)',
      },
      {
        id: 'support',
        title: t.services.supportTitle,
        subtitle: t.services.supportSub,
        Icon: SupportIcon,
        iconColor: '#7C3AED',
        iconBg: 'rgba(124, 58, 237, 0.14)',
      },
    ],
    [t]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom']}>
      <SimpleHeader title={t.services.headerTitle} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sessionCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sessionLabel}>{t.services.yourSession}</Text>
            <View style={styles.pcRow}>
              <Text style={styles.pcId}>{pcLabel}</Text>
              {activePc && (
                <View style={styles.activeWrap}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>{t.services.activeBadge}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.balanceWrap}>
            <Text style={styles.balanceLabel}>{t.services.balanceLabel}</Text>
            <Text style={styles.balanceValue}>
              {(activeMembership?.balance ?? 0).toLocaleString('ru-RU').replace(/,/g, ' ')} {t.common.currencyUnit}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t.services.sectionTitle}</Text>

        {REQUESTS.map(({ id, title, subtitle, Icon, iconColor, iconBg }) => (
          <TouchableOpacity
            key={id}
            style={[styles.requestRow, submittingId === id && styles.requestRowBusy]}
            activeOpacity={0.7}
            onPress={() => handleRequest(id as 'staff' | 'issue' | 'support')}
            disabled={submittingId !== null}
            accessibilityRole="button"
            accessibilityLabel={title}
          >
            <View style={[styles.requestIcon, { backgroundColor: iconBg }]}>
              <Icon size={18} color={iconColor} />
            </View>
            <View style={styles.requestContent}>
              <Text style={styles.requestTitle}>{title}</Text>
              <Text style={styles.requestSubtitle}>{subtitle}</Text>
            </View>
            <ChevronRightIcon size={16} color="#8B95A8" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.subTabs}>
        <SubTab label={t.activeSession.tabSession} Icon={GamepadIcon} onPress={() => router.replace('/active-session')} />
        <SubTab label={t.activeSession.tabServices} Icon={StaffIcon} active />
        {/* Same coming-soon gating as active-session — keep the slots
            visible so the bottom-nav layout stays consistent across
            screens (audit MED). */}
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
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  sessionLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  pcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  pcId: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: 1,
  },
  activeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  activeText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11.5,
    color: '#22C55E',
  },
  balanceWrap: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#8B95A8',
  },
  balanceValue: {
    fontFamily: Fonts.inter.bold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  requestRowBusy: {
    opacity: 0.5,
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestContent: {
    flex: 1,
    gap: 2,
  },
  requestTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  requestSubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
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
