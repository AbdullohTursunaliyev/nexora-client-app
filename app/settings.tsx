import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../store/AuthProvider';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { useToast } from '../components/common/Toast';
import appJson from '../app.json';
import TabProfileIcon from '../components/icons/TabProfileIcon';
import LightningIcon from '../components/icons/LightningIcon';
import LockIcon from '../components/icons/LockIcon';
import CardIcon from '../components/icons/CardIcon';
import CalendarIcon from '../components/icons/CalendarIcon';
import BellIcon from '../components/icons/BellIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import BackIcon from '../components/icons/BackIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { LOCALE_NATIVE_LABEL } from '../lib/i18n/translations';
import { useLocale } from '../lib/i18n/LocaleProvider';
import { useDialog } from '../components/common/AppDialog';

// App version mirrors the source of truth in `app.json`. Reading it
// directly avoids an extra `expo-constants` dependency just to surface
// the marketing string at the bottom of the settings screen.
const APP_VERSION = (appJson as { expo?: { version?: string } }).expo?.version ?? '1.0.0';

type SettingsRow = {
  id: string;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  /** Route to push when tapped. `null` → row is non-tappable (soon-gated). */
  route: string | null;
  /**
   * Pre-launch flag — when true the row renders dimmed with a "Soon"
   * badge instead of a chevron, and the tap is a no-op. Distinguishes
   * "we haven't built this yet" from "broken / coming later".
   */
  soon?: boolean;
};

export default function SettingsScreen() {
  const { logout } = useAuth();
  const t = useT();
  const dialog = useDialog();
  const toast = useToast();
  const { locale } = useLocale();

  // Each row has an explicit destination (route) OR a `null` to flag
  // "BE/screen not shipped yet — show the user a soon-toast instead of
  // tapping into nothing." Pre-fix every row had `onPress={undefined}`
  // and the tap appeared broken to users.
  const SETTINGS: SettingsRow[] = [
    { id: '1', title: t.settings.account.title, subtitle: t.settings.account.subtitle, Icon: TabProfileIcon, color: '#00CFFF', route: '/profile-edit' },
    // Preferences / Privacy / Payment are soon-gated: no BE endpoints
    // for them yet. Pre-fix tapping surfaced a "coming soon" toast,
    // but the chevron made the row look like a working destination.
    // Now they render dimmed + non-tappable with a "Soon" badge,
    // matching the profile-menu pattern.
    { id: '2', title: t.settings.preferences.title, subtitle: t.settings.preferences.subtitle, Icon: LightningIcon, color: '#F59E0B', route: null, soon: true },
    { id: '3', title: t.settings.privacy.title, subtitle: t.settings.privacy.subtitle, Icon: LockIcon, color: '#22C55E', route: null, soon: true },
    { id: '4', title: t.settings.payment.title, subtitle: t.settings.payment.subtitle, Icon: CardIcon, color: '#7C3AED', route: null, soon: true },
    { id: '5', title: t.settings.history.title, subtitle: t.settings.history.subtitle, Icon: CalendarIcon, color: '#FF34E0', route: '/(tabs)/bookings' },
    { id: '6', title: t.settings.notifications.title, subtitle: t.settings.notifications.subtitle, Icon: BellIcon, color: '#3B82F6', route: '/notifications' },
  ];

  const onRowPress = (row: SettingsRow) => {
    // Soon rows are non-tappable — the row renders without a
    // TouchableOpacity wrapper below, but the guard here is
    // belt-and-braces in case future refactors miss the soon flag.
    if (row.soon) return;
    if (row.route) {
      router.push(row.route as never);
    } else {
      toast.info(t.settings.comingSoon);
    }
  };

  const onLogout = async () => {
    const ok = await dialog.confirm({
      title: t.settings.logoutTitle,
      message: t.settings.logoutMessage,
      confirmLabel: t.settings.confirmLogout,
      cancelLabel: t.settings.cancel,
      destructive: true,
    });
    if (!ok) return;
    await logout();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <BackIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.settings.title}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {SETTINGS.map((row) => {
          const inner = (
            <>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${row.color}1F`, opacity: row.soon ? 0.5 : 1 },
                ]}
              >
                <row.Icon size={18} color={row.color} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, row.soon && styles.rowTitleDisabled]}>
                  {row.title}
                </Text>
                <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
              </View>
              {row.soon ? (
                <View style={styles.soonBadge}>
                  <Text style={styles.soonBadgeText}>{t.profile.soon}</Text>
                </View>
              ) : (
                <ChevronRightIcon size={16} color="#8B95A8" />
              )}
            </>
          );
          if (row.soon) {
            return (
              <View key={row.id} style={styles.row}>
                {inner}
              </View>
            );
          }
          return (
            <TouchableOpacity
              key={row.id}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => onRowPress(row)}
            >
              {inner}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.langRow}
          activeOpacity={0.7}
          onPress={() => router.push('/language-select')}
        >
          <Text style={styles.toggleLabel}>{t.settings.language}</Text>
          <View style={styles.langRight}>
            <Text style={styles.langValue}>{LOCALE_NATIVE_LABEL[locale]}</Text>
            <ChevronRightIcon size={16} color="#8B95A8" />
          </View>
        </TouchableOpacity>

        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>{t.settings.about}</Text>
          <Text style={styles.versionValue}>{t.settings.versionPrefix} {APP_VERSION}</Text>
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>{t.settings.logout}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#141823',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    color: Colors.text,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  rowTitleDisabled: {
    color: '#6B7280',
  },
  rowSubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  soonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 207, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.4)',
  },
  soonBadgeText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 10,
    color: '#00CFFF',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  toggleLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13.5,
    color: Colors.text,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141823',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 14,
  },
  langRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langValue: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginTop: 14,
  },
  versionLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#8B95A8',
  },
  versionValue: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#6B7280',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  logoutText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: '#EF4444',
  },
});
