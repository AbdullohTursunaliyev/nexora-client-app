import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import AuthGate from '../components/common/AuthGate';
import SimpleHeader from '../components/common/SimpleHeader';
import GiftIcon from '../components/icons/GiftIcon';
import CopyIcon from '../components/icons/CopyIcon';
import ShareIcon from '../components/icons/ShareIcon';
import CheckIcon from '../components/icons/CheckIcon';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import { getReferralInfo, type ReferralResponse } from '../lib/api/services/referrals';
import { useT } from '../lib/i18n/LocaleProvider';

export default function ReferEarnScreen() {
  return (
    <AuthGate>
      <ReferEarnInner />
    </AuthGate>
  );
}

function ReferEarnInner() {
  const t = useT();
  const toast = useToast();
  const [data, setData] = useState<ReferralResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError(null);
    try {
      setData(await getReferralInfo());
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyCode = async () => {
    if (!data?.code) return;
    await Clipboard.setStringAsync(data.code);
    toast.success(t.referEarn.copiedToast);
  };

  const shareLink = async () => {
    if (!data?.invite_url) return;
    await Share.share({
      message: `${t.referEarn.shareMessage}\n${data.invite_url}`,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SimpleHeader title={t.referEarn.headerTitle} />
      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color="#00CFFF" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('refresh')}
              tintColor="#00CFFF"
            />
          }
        >
          {error ? (
            <TouchableOpacity
              style={styles.errorCard}
              activeOpacity={0.8}
              onPress={() => void load()}
            >
              <Text style={styles.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : null}

          <LinearGradient
            colors={['#111827', '#182235']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroIcon}>
              <GiftIcon size={34} color="#22C55E" />
            </View>
            <Text style={styles.heroTitle}>{t.referEarn.title}</Text>
          </LinearGradient>

          {data ? (
            <>
              <View style={styles.codeCard}>
                <Text style={styles.label}>{t.referEarn.codeLabel}</Text>
                <View style={styles.codeRow}>
                  <Text style={styles.codeText}>{data.code}</Text>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={copyCode}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={t.referEarn.copyCodeA11y}
                  >
                    <CopyIcon size={18} color="#00CFFF" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.shareButton}
                  activeOpacity={0.85}
                  onPress={shareLink}
                  accessibilityRole="button"
                  accessibilityLabel={t.referEarn.shareLinkA11y}
                >
                  <ShareIcon size={18} color="#0B0F16" />
                  <Text style={styles.shareButtonText}>{t.referEarn.linkLabel}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.statsRow}>
                <StatCard label={t.referEarn.statInvites} value={formatNumber(data.total_invites)} />
                <StatCard label={t.referEarn.statActive} value={formatNumber(data.active_friends)} />
                <StatCard label={t.referEarn.statPoints} value={formatNumber(data.points_earned)} />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t.referEarn.howItWorks}</Text>
                <Step index={1} text={t.referEarn.step1} />
                <Step index={2} text={t.referEarn.step2} />
                <Step index={3} text={t.referEarn.step3} />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t.referEarn.milestones}</Text>
                {data.milestones.map((milestone) => (
                  <View key={milestone.id} style={styles.milestoneRow}>
                    <View style={styles.milestoneTextCol}>
                      <Text style={styles.milestoneTitle}>
                        {t.referEarn.milestoneTemplate.replace('{n}', String(milestone.target))}
                      </Text>
                      <Text style={styles.milestoneSub}>
                        {formatNumber(milestone.progress)} / {formatNumber(milestone.target)}
                      </Text>
                    </View>
                    <View style={[styles.rewardPill, milestone.completed && styles.rewardPillDone]}>
                      {milestone.completed ? (
                        <CheckIcon size={14} color="#0B0F16" />
                      ) : null}
                      <Text style={[styles.rewardText, milestone.completed && styles.rewardTextDone]}>
                        {milestone.completed ? t.referEarn.received : formatNumber(milestone.reward_points)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Step({ index, text }: { index: number; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIndex}>
        <Text style={styles.stepIndexText}>{index}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function formatNumber(value: number): string {
  return String(Math.max(0, Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 28 },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#FCA5A5',
  },
  hero: {
    borderRadius: 20,
    padding: 20,
    minHeight: 150,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  heroTitle: {
    marginTop: 18,
    fontFamily: Fonts.inter.bold,
    fontSize: 25,
    lineHeight: 31,
    color: Colors.text,
    letterSpacing: 0,
  },
  codeCard: {
    marginTop: 14,
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  label: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12,
    color: '#8B95A8',
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeText: {
    flex: 1,
    fontFamily: Fonts.orbitron.bold,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: 0,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 207, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.28)',
  },
  shareButton: {
    marginTop: 14,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 14,
    color: '#0B0F16',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#141823',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statValue: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
  },
  statLabel: {
    marginTop: 4,
    fontFamily: Fonts.inter.medium,
    fontSize: 11,
    color: '#8B95A8',
    textAlign: 'center',
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  stepIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 13,
    color: '#00CFFF',
  },
  stepText: {
    flex: 1,
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  milestoneTextCol: { flex: 1 },
  milestoneTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  milestoneSub: {
    marginTop: 4,
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
  },
  rewardPill: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rewardPillDone: {
    backgroundColor: '#22C55E',
  },
  rewardText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 11.5,
    color: Colors.text,
  },
  rewardTextDone: {
    color: '#0B0F16',
  },
});
