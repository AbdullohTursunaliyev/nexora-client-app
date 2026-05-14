import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import BellIcon from '../components/icons/BellIcon';
import TrophyIcon from '../components/icons/TrophyIcon';
import GiftIcon from '../components/icons/GiftIcon';
import CheckIcon from '../components/icons/CheckIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import {
  useNotificationPrefs,
  type NotificationPrefs,
} from '../lib/hooks/useNotificationPrefs';

type IconCmp = React.ComponentType<{ size?: number; color?: string }>;

interface CategoryRow {
  key: keyof NotificationPrefs;
  title: string;
  subtitle: string;
  Icon: IconCmp;
  color: string;
}

/**
 * /notification-settings — per-category push preferences.
 *
 * Pre-fix the Settings menu's "Bildirishnoma sozlamalari / Настройки
 * уведомлений / Notification settings" row routed to /notifications,
 * which is the INBOX (a list of received messages), not a settings
 * surface. Users tapped "settings" and got a feed — and the same feed
 * was already reachable from the bell icon on Home, so the row was
 * functionally a duplicate AND misleadingly labelled.
 *
 * This screen is the real preferences UI. Four category toggles
 * (bookings / tournaments / offers / system) mirror the BE
 * `MobileNotification.category` values, persisted to AsyncStorage via
 * `useNotificationPrefs`.
 *
 * Why local-only for now: the BE doesn't yet honor per-user push
 * delivery preferences — there's no `notification_preferences` table
 * or `prefs_json` column on MobileUser. Persisting locally means:
 *   1. The user's choice survives app reopens
 *   2. When the BE push pipeline lands, we can pump these prefs to
 *      the server in a migration POST (one round-trip on next launch)
 *   3. Until then, future surfaces (the bell-badge counter, an
 *      in-app banner sheet) can read the prefs and respect muted
 *      categories client-side
 *
 * The "Push notifications coming soon" banner at the top sets the
 * right expectation — without it the toggles would seem broken
 * ("I muted offers but I still got a discount notification").
 */
export default function NotificationSettingsScreen() {
  const t = useT();
  const { prefs, update, loaded } = useNotificationPrefs();

  const CATEGORIES: CategoryRow[] = [
    {
      key: 'bookings',
      title: t.notificationSettings.catBookings,
      subtitle: t.notificationSettings.catBookingsSub,
      Icon: CheckIcon,
      color: '#22C55E',
    },
    {
      key: 'tournaments',
      title: t.notificationSettings.catTournaments,
      subtitle: t.notificationSettings.catTournamentsSub,
      Icon: TrophyIcon,
      color: '#F59E0B',
    },
    {
      key: 'offers',
      title: t.notificationSettings.catOffers,
      subtitle: t.notificationSettings.catOffersSub,
      Icon: GiftIcon,
      color: '#7C3AED',
    },
    {
      key: 'system',
      title: t.notificationSettings.catSystem,
      subtitle: t.notificationSettings.catSystemSub,
      Icon: BellIcon,
      color: '#00CFFF',
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SimpleHeader title={t.notificationSettings.headerTitle} />

      {!loaded ? (
        // Brief spinner while AsyncStorage settles — pre-fix the
        // toggles flashed in the "all-on" default state before the
        // user's saved choices loaded, which felt like the toggles
        // were reverting themselves.
        <ActivityIndicator
          color={Colors.primary}
          style={{ marginTop: 48 }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* "Push delivery soon" banner — sets expectations that
              these toggles are remembered now, applied later. Without
              this card the toggles feel half-broken ("I muted offers
              and still got a push"). */}
          <View style={styles.soonCard}>
            <View style={styles.soonIconWrap}>
              <BellIcon size={20} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.soonTitle}>
                {t.notificationSettings.soonBannerTitle}
              </Text>
              <Text style={styles.soonSub}>
                {t.notificationSettings.soonBannerSub}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            {t.notificationSettings.categoriesSection}
          </Text>

          {CATEGORIES.map((row) => (
            <View key={row.key} style={styles.row}>
              <View
                style={[styles.iconWrap, { backgroundColor: `${row.color}1F` }]}
              >
                <row.Icon size={18} color={row.color} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSub}>{row.subtitle}</Text>
              </View>
              <Switch
                value={prefs[row.key]}
                onValueChange={(next) => update({ [row.key]: next })}
                // Brand colours so the toggle reads as part of the
                // cyan/dark palette rather than the platform default
                // grey/blue. iOS uses `trackColor.true`, Android uses
                // `thumbColor` + `trackColor` together.
                trackColor={{
                  false: '#2A2F3A',
                  true: 'rgba(0, 207, 255, 0.45)',
                }}
                thumbColor={
                  Platform.OS === 'android'
                    ? prefs[row.key]
                      ? '#00CFFF'
                      : '#8B95A8'
                    : undefined
                }
                ios_backgroundColor="#2A2F3A"
              />
            </View>
          ))}

          {/* Footer link to the inbox — explicit, since this screen
              took over the Settings→Notifications row that used to
              navigate there directly. Inbox is still reachable from
              the bell icon on Home, so this is a secondary path. */}
          <TouchableOpacity
            style={styles.inboxLink}
            activeOpacity={0.75}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={t.notificationSettings.viewInboxLabel}
          >
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(0, 207, 255, 0.18)' }]}>
              <BellIcon size={18} color="#00CFFF" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>
                {t.notificationSettings.viewInboxLabel}
              </Text>
              <Text style={styles.rowSub}>
                {t.notificationSettings.viewInboxSub}
              </Text>
            </View>
            <ChevronRightIcon size={16} color="#8B95A8" />
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  soonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  soonIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soonTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: '#F59E0B',
    marginBottom: 4,
  },
  soonSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#C7CAD1',
    lineHeight: 18,
  },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#8B95A8',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
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
  rowContent: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  rowSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
    lineHeight: 16,
  },
  inboxLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginTop: 14,
  },
});
