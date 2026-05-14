import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import CheckIcon from '../components/icons/CheckIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { LOCALE_NATIVE_LABEL, type Locale } from '../lib/i18n/translations';
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
  const { locale, setLocale } = useLocale();
  const insets = useSafeAreaInsets();
  // Inline bottom-sheet language picker — replaces the previous
  // `router.push('/language-select')` jump to a dedicated screen.
  // Matches the pattern shipped on the login screen (and the
  // discover CitySheet, club-join sheet, etc.) so language change
  // feels identical wherever the user encounters it. Saves a full
  // screen transition for what is effectively a 3-row picker.
  const [langSheetOpen, setLangSheetOpen] = useState(false);
  const LOCALES: Locale[] = ['uz', 'ru', 'en'];
  const onPickLocale = async (next: Locale) => {
    setLangSheetOpen(false);
    if (next !== locale) await setLocale(next);
  };

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
    // "Bitim tarixi / История транзакций / Transaction history" — the row
    // copy explicitly promises transaction (= top-up / cashback / charge)
    // history. Pre-fix it routed to /(tabs)/bookings (the reservation
    // list), so users tapping "Transaction history" landed on bookings
    // and were rightly confused. Now points at the dedicated
    // /transaction-history screen that calls /mobile/wallet/transactions
    // and renders the real money-in/out feed.
    { id: '5', title: t.settings.history.title, subtitle: t.settings.history.subtitle, Icon: CalendarIcon, color: '#FF34E0', route: '/transaction-history' },
    // "Bildirishnoma sozlamalari / Настройки уведомлений / Notification
    // settings" — the row copy promises SETTINGS (per-category toggles),
    // not just the inbox. Pre-fix it routed to /notifications (the inbox
    // list), which was reachable from the bell icon on home anyway — so
    // this row duplicated existing access AND was misleadingly labelled
    // "settings" when no preferences UI existed. Now routes to
    // /notification-settings with real per-category toggles (locally
    // persisted until the push pipeline lands BE-side).
    { id: '6', title: t.settings.notifications.title, subtitle: t.settings.notifications.subtitle, Icon: BellIcon, color: '#3B82F6', route: '/notification-settings' },
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
        {/* Transparent spacer keeps the title centered between the back
            button and the trailing edge. Pre-fix this re-used the
            `styles.backBtn` style, which renders with a gray
            backgroundColor (#141823) — so a mysterious gray pill
            appeared in the top-right corner of the settings header
            even though nothing was clickable there. The dedicated
            `headerSpacer` style is a same-size transparent View, so
            the visual weight on either side of the title matches
            without painting a button-shaped placeholder. */}
        <View style={styles.headerSpacer} />
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

        {/* Language row — taps open an inline bottom-sheet rather
            than navigating to a separate /language-select screen.
            Cheaper transition (no route push, no header refit) and
            stays consistent with the login screen's language picker. */}
        <TouchableOpacity
          style={styles.langRow}
          activeOpacity={0.7}
          onPress={() => setLangSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t.settings.language}
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

      {/* Bottom-sheet language picker — mirrors the login screen's
          implementation so language change behaves identically across
          the app. Uses the sibling-backdrop layout pattern (Pressable
          absoluteFill behind a content View) rather than the legacy
          nested-Pressable + stopPropagation pattern, which doesn't
          map cleanly to RN's gesture system and can swallow taps. */}
      <Modal
        visible={langSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLangSheetOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setLangSheetOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t.settings.cancel}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 20) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t.language.title}</Text>
            <Text style={styles.sheetSub}>{t.language.subtitle}</Text>

            <View style={styles.sheetList}>
              {LOCALES.map((loc) => {
                const isActive = loc === locale;
                return (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.sheetRow, isActive && styles.sheetRowActive]}
                    activeOpacity={0.7}
                    onPress={() => onPickLocale(loc)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={LOCALE_NATIVE_LABEL[loc]}
                  >
                    <Text style={styles.sheetRowFlag}>
                      {loc === 'uz' ? '🇺🇿' : loc === 'ru' ? '🇷🇺' : '🇬🇧'}
                    </Text>
                    <Text style={styles.sheetRowLabel}>{LOCALE_NATIVE_LABEL[loc]}</Text>
                    {isActive && (
                      <View style={styles.sheetCheckBg}>
                        <CheckIcon size={12} color={Colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
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
  // Transparent spacer used as the trailing placeholder in the
  // header — same footprint as `backBtn` so the title sits centered,
  // but no background fill (pre-fix the empty `View` reused backBtn
  // and rendered as a phantom gray pill).
  headerSpacer: {
    width: 38,
    height: 38,
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
  // Bottom-sheet language picker — same styling as the login
  // screen's language sheet so the picker reads as the same
  // component wherever it appears. Sibling-backdrop layout (Pressable
  // absoluteFill + content View) is the post-bug-fix pattern that
  // doesn't suffer from RN's gesture-bubble issues.
  sheetRoot: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#141823',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A4250',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
  },
  sheetSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    marginTop: 4,
    marginBottom: 14,
  },
  sheetList: { gap: 8 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F2B',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sheetRowActive: {
    borderColor: '#00CFFF',
    backgroundColor: 'rgba(0, 207, 255, 0.06)',
  },
  sheetRowFlag: { fontSize: 22 },
  sheetRowLabel: {
    flex: 1,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  sheetCheckBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00CFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
