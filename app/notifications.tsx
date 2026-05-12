import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Trash2 as TrashIcon } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import BackIcon from '../components/icons/BackIcon';
import CheckIcon from '../components/icons/CheckIcon';
import TrophyIcon from '../components/icons/TrophyIcon';
import GiftIcon from '../components/icons/GiftIcon';
import BellIcon from '../components/icons/BellIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { useDialog } from '../components/common/AppDialog';
import { getErrorMessage } from '../lib/api/client';
import * as notificationsApi from '../lib/api/services/notifications';
import { sanitizeRoute } from '../lib/utils/safeRoute';
import { useAuth } from '../store/AuthProvider';
import {
  clearUnread,
  decrementUnread,
  setUnreadCount,
} from '../lib/state/notificationUnread';

type FilterKey = 'all' | 'bookings' | 'tournaments' | 'offers' | 'system';

/**
 * Relative-time formatter for the notification list. ISO timestamps
 * come straight off `MobileNotification::created_at` — turning them
 * into "Just now" / "5m ago" / "2h ago" / "12 May" matches every other
 * social feed convention. Returns `''` for invalid input so the row
 * just hides the time chip instead of rendering `NaN`.
 */
function formatRelativeTime(iso: string | null | undefined, t: ReturnType<typeof useT>): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const deltaSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  // Sub-minute deltas are "Just now" — pre-fix this rounded up to
  // "1 min ago" which made every fresh push notification look a minute
  // old the instant it arrived.
  if (deltaSec < 60) return t.notifications.timeNow;
  if (deltaSec < 3600) {
    const min = Math.floor(deltaSec / 60);
    return t.notifications.timeMinutes.replace('{n}', String(min));
  }
  if (deltaSec < 86400) {
    const h = Math.floor(deltaSec / 3600);
    return t.notifications.timeHours.replace('{n}', String(h));
  }
  // Older than a day → fall back to a localised short date. Stays
  // numeric/abbrev so it fits the row chip without truncation.
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '';
  }
}

type IconCmp = React.ComponentType<{ size?: number; color?: string }>;

interface Notification {
  id: string;
  /** Real BE id, kept around so mark-read can POST to /notifications/:id/read. */
  rawId: number;
  category: FilterKey;
  Icon: IconCmp;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  /** Optional CTA target — tapping the row navigates here when present. */
  actionUrl: string | null;
}

/**
 * Map a BE category string to the local FilterKey + visual style.
 * Defensive: the field is typed as a string but if the BE ever returns
 * null / number, the pre-fix `.toLowerCase()` crashed the whole list
 * with "Cannot read property 'toLowerCase' of null". The `String()`
 * coercion below makes the screen survive a malformed row.
 */
function mapCategory(raw: unknown): {
  cat: FilterKey;
  visuals: { Icon: IconCmp; iconColor: string; iconBg: string };
} {
  const norm = String(raw ?? '').toLowerCase();
  const cat: FilterKey = (() => {
    if (norm === 'booking' || norm === 'bookings') return 'bookings';
    if (norm === 'tournament' || norm === 'tournaments') return 'tournaments';
    if (norm === 'promo' || norm === 'offer' || norm === 'offers') return 'offers';
    return 'system';
  })();
  const visuals = (() => {
    switch (cat) {
      case 'bookings':
        return { Icon: CheckIcon as IconCmp, iconColor: '#22C55E', iconBg: 'rgba(34, 197, 94, 0.15)' };
      case 'tournaments':
        return { Icon: TrophyIcon as IconCmp, iconColor: '#F59E0B', iconBg: 'rgba(245, 158, 11, 0.15)' };
      case 'offers':
        return { Icon: GiftIcon as IconCmp, iconColor: '#7C3AED', iconBg: 'rgba(124, 58, 237, 0.15)' };
      default:
        return { Icon: BellIcon as IconCmp, iconColor: '#00CFFF', iconBg: 'rgba(0, 207, 255, 0.15)' };
    }
  })();
  return { cat, visuals };
}

export default function NotificationsScreen() {
  const t = useT();
  const toast = useToast();
  const dialog = useDialog();
  // Read the live tenant id so the list call here matches the scope
  // HomeHeader uses. Pre-fix HomeHeader's `listNotifications(undefined,
  // currentTenantId)` and the screen's bare `listNotifications()`
  // returned different rows + unread_count for users on a tenant with
  // scoped notifications — bell badge counted "global + tenant" while
  // this list only showed "global", so a "mark all read" on this
  // screen never zeroed the bell.
  const { currentTenantId } = useAuth();
  const [tab, setTab] = useState<FilterKey>('all');
  // `items` is the live list. `unread` is mutated locally on tap so
  // the UI updates instantly; the BE mark-read POST runs in the
  // background and reconciles other devices. Pre-fix we kept a
  // parallel `readIds: Set<string>` alongside `unread` — every code
  // path needed to AND the two to know if a row was read, and a stale
  // `readIds` entry after a refetch made "Mark all as read" appear to
  // do nothing.
  const [items, setItems] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Memoise on `t` so the arrays are recreated only when locale flips.
  // Pre-fix (FE-H6) these literal objects were rebuilt on every render
  // and used as deps in useMemo below — defeating the memo entirely
  // (every render = new array reference = invalidated memo).
  const TABS = useMemo<{ key: FilterKey; label: string }[]>(
    () => [
      { key: 'all', label: t.notifications.tabAll },
      { key: 'bookings', label: t.notifications.tabBookings },
      { key: 'tournaments', label: t.notifications.tabTournaments },
      { key: 'offers', label: t.notifications.tabOffers },
      { key: 'system', label: t.notifications.tabSystem },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    if (tab === 'all') return items;
    return items.filter((n) => n.category === tab);
  }, [tab, items]);

  const unreadCount = useMemo(
    () => items.filter((n) => n.unread).length,
    [items],
  );

  /**
   * Pull real notifications from BE and replace state.
   *
   * Pre-fix `t` was missing from the useCallback deps. When the user
   * flipped locale mid-session, `formatRelativeTime` captured the old
   * `t` and the time chips kept rendering in the previous language
   * until they re-fetched. The dep is correct now — every locale
   * change re-creates loadNotifications, which the mount-effect picks
   * up and re-runs.
   *
   * Also defensive: sort by `created_at` desc so the newest row is
   * always at index 0 even if the BE ever returns out-of-order
   * pages. Belt-and-braces — the BE controller orders by `created_at`
   * already, but a future endpoint change shouldn't silently break
   * the chronological ordering the user expects.
   */
  const loadNotifications = useCallback(
    async (surfaceSpinner = false) => {
      if (surfaceSpinner) setRefreshing(true);
      try {
        const res = await notificationsApi.listNotifications(undefined, currentTenantId);
        const mapped = (res.items ?? []).map<Notification>((n) => {
          const { cat, visuals } = mapCategory(n.category);
          return {
            id: String(n.id),
            rawId: n.id,
            category: cat,
            ...visuals,
            title: n.title,
            description: n.description,
            // Pre-fix this rendered the raw ISO string directly.
            time: formatRelativeTime(n.created_at, t),
            unread: !n.read,
            actionUrl: n.action_url ?? null,
          };
        });
        // Newest-first defensive sort. BE assigns monotonically
        // increasing ids, so `b.rawId - a.rawId` puts the newest row
        // at index 0 even if the BE ever returns out-of-order pages.
        // Belt-and-braces — the BE controller already orders by
        // `created_at`, but a future endpoint change shouldn't silently
        // break chronological ordering.
        mapped.sort((a, b) => b.rawId - a.rawId);
        setItems(mapped);
        // Re-sync the shared unread singleton from authoritative BE
        // state so the bell badge on /home reflects exactly what we
        // just loaded. Without this push, only the local `items`
        // state knew about reads/unreads and the badge stayed stale
        // even after a successful fetch on this screen.
        const beUnread =
          typeof res.unread_count === 'number' ? res.unread_count : null;
        const fallback = mapped.filter((n) => n.unread).length;
        setUnreadCount(beUnread ?? fallback);
      } catch (e) {
        // Surface a toast on real failures — pre-fix the silent catch
        // hid 401 / network errors so the user just saw an empty
        // list with no idea why. Empty list will still render the
        // friendly empty-state.
        toast.error(getErrorMessage(e));
      } finally {
        if (surfaceSpinner) setRefreshing(false);
      }
    },
    [t, toast, currentTenantId],
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Auto-mark-on-open was REMOVED at the user's request — the timing
  // heuristics (delay + unmount safety net) interacted unpredictably
  // with Android swipe-back gestures vs button back, and produced
  // races where the bell occasionally flashed back to the stale
  // count. The flow is now purely button-driven:
  //
  //   • "Mark all read" footer (visible while unreadCount > 0) —
  //     batch flip + POST.
  //   • Tap a row — single mark + POST + optional navigate via
  //     action_url.
  //   • "Clear all" header action (visible while items.length > 0) —
  //     wipes the list entirely (DELETE on BE), zeroes the bell.
  //
  // The bell singleton stays in sync because all three paths call
  // the appropriate decrementUnread / clearUnread BEFORE the BE
  // POST, so the badge updates instantly without depending on
  // server round-trip timing.

  /**
   * Tap handler: flip local read state instantly, POST mark-read to
   * BE in the background, optionally navigate to the row's CTA. Pre-
   * fix (deep audit P2) we only mutated a local Set without ever
   * calling /notifications/:id/read — so other devices still showed
   * the row as unread even after the user explicitly tapped it.
   */
  const onPressNotification = (n: Notification) => {
    if (n.unread) {
      // Optimistic UI update — flip locally before the round-trip.
      setItems((prev) =>
        prev.map((it) => (it.id === n.id ? { ...it, unread: false } : it)),
      );
      // Push the optimistic count into the shared singleton so the
      // home tab's bell badge decrements INSTANTLY — pre-fix the
      // badge waited on the BE round-trip + a focus-driven refetch
      // and showed the old count for ~50ms after the user came back.
      decrementUnread(1);
      notificationsApi.markRead(n.rawId).catch(() => {
        // Quiet: if BE rejects (rare), the row stays read locally; the
        // next refetch will reconcile from authoritative state.
      });
    }
    if (n.actionUrl) {
      // sanitizeRoute strips known-bad inputs (empty / non-string /
      // mailto / tel / javascript / custom schemes / `//x` traversal)
      // so a malformed action_url can't deep-link us to a route that
      // doesn't exist or open the device browser unexpectedly.
      const target = sanitizeRoute(n.actionUrl);
      // Only follow in-app absolute paths here. https:// links exist on
      // the whitelist but would need an explicit WebView / Linking
      // hand-off — we don't ship that UX yet for notifications.
      if (target && target.startsWith('/')) {
        router.push(target as never);
      }
    }
  };

  /**
   * Mark every visible-as-unread row as read. Optimistic local update
   * + BE POST. We don't surface the BE error to the user because the
   * local UI already reflects the read state; the next refetch will
   * reconcile if the BE rejected.
   */
  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setItems((prev) => prev.map((n) => (n.unread ? { ...n, unread: false } : n)));
    // Zero-out the shared singleton so the home tab's bell badge
    // disappears the instant the user taps "Mark all as read".
    clearUnread();
    // Pass the active tenant so the BE marks tenant-scoped rows
    // (booking confirms, tournament alerts) in addition to the
    // user-global bucket — pre-fix the bare call left tenant rows
    // unread, so the next refresh would snap the bell back up.
    notificationsApi.markAllRead(currentTenantId).catch(() => {
      // See onPressNotification — local state remains read, refetch
      // reconciles.
    });
  };

  /**
   * Wipe every notification — destructive, gated behind a confirm
   * dialog. The DELETE is fire-and-forget after the optimistic local
   * empty-state; if the BE fails (rare) the next refetch reconciles
   * by re-populating. clearUnread keeps the bell badge in sync since
   * an empty list trivially has zero unread.
   */
  const clearAll = async () => {
    if (items.length === 0) return;
    const ok = await dialog.confirm({
      title: t.notifications.clearAllConfirmTitle,
      message: t.notifications.clearAllConfirmMessage,
      confirmLabel: t.notifications.clearAllConfirm,
      cancelLabel: t.notifications.clearAllCancel,
      destructive: true,
    });
    if (!ok) return;

    // Optimistic: empty the list + zero the bell BEFORE the BE call.
    setItems([]);
    clearUnread();
    try {
      // Pass tenant scope so the BE wipes both global + tenant rows
      // in lock-step with the listNotifications scope this screen uses.
      await notificationsApi.clearAllNotifications(currentTenantId);
      toast.success(t.notifications.clearAllToast);
    } catch (e) {
      // Surface — destructive action failing is worth telling the
      // user about (unlike the silent mark-read case). The local
      // empty state stays; next refetch reconciles if needed.
      toast.error(getErrorMessage(e));
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.card, item.unread && styles.cardUnread]}
      activeOpacity={0.85}
      onPress={() => onPressNotification(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.unread ? ', unread' : ''}`}
    >
      {item.unread && <View style={styles.unreadBar} />}
      <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
        <item.Icon size={18} color={item.iconColor} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, item.unread && styles.titleUnread]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!!item.time && <Text style={styles.time}>{item.time}</Text>}
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Shared empty-state. Wrapped in a ScrollView with RefreshControl so
  // pull-to-refresh works even when the list is empty (pre-fix the
  // empty View had no scroll → no pull gesture → user had to back out
  // + re-open the screen to retry).
  const renderEmpty = () => (
    <ScrollView
      contentContainerStyle={styles.emptyScroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadNotifications(true)}
          tintColor="#00CFFF"
        />
      }
    >
      <View style={styles.empty}>
        <View style={styles.emptyIconWrap}>
          <BellIcon size={32} color="#8B95A8" />
        </View>
        <Text style={styles.emptyTitle}>{t.notifications.emptyTitle}</Text>
        <Text style={styles.emptySub}>{t.notifications.emptySub}</Text>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <BackIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.headerTitle}>{t.notifications.headerTitle}</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {/* Trash icon replaces the never-implemented "notification
            preferences" cog. Disabled when the list is empty so the
            user doesn't tap into a dialog that confirms deletion of
            nothing. Tint shifts to red when interactive to signal the
            destructive nature of the action. */}
        <TouchableOpacity
          style={[styles.iconBtn, items.length > 0 && styles.iconBtnDestructive]}
          activeOpacity={0.7}
          onPress={clearAll}
          disabled={items.length === 0}
          accessibilityRole="button"
          accessibilityLabel={t.notifications.clearAllA11y}
          accessibilityState={{ disabled: items.length === 0 }}
        >
          <TrashIcon
            size={19}
            color={items.length === 0 ? '#3A4250' : '#EF4444'}
            strokeWidth={1.8}
          />
        </TouchableOpacity>
      </View>

      {/* Tabs ScrollView is wrapped in a fixed-height shell so it can't
          grow vertically on layout reflow. Pre-fix the horizontal
          ScrollView had no height constraint; on some devices RN
          allocated extra column space to it and the list below was
          visually pushed into the middle of the screen — matching the
          user's "ular centerda turibti" complaint. The shell pins the
          row to a deterministic ~46pt height regardless of children. */}
      <View style={styles.tabsShell}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map(({ key, label }) => {
            const isActive = tab === key;
            return (
              <Pressable
                key={key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setTab(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        renderEmpty()
      ) : (
        // FlatList instead of ScrollView+.map (RESP-C2). The notifications
        // history can grow into the hundreds for active users — virtualising
        // keeps memory + scroll perf bounded regardless of length. The
        // mark-all-read footer is rendered via ListFooterComponent so it
        // stays inside the same scroll container.
        //
        // CRITICAL: `style={styles.list}` (flex:1) is what makes the rows
        // start from the top of the available area. Without it the
        // FlatList rendered at its natural content height (~200pt for two
        // rows) and the SafeAreaView's flex layout positioned that block
        // vertically wherever it landed — the user's "ular centerda
        // turibti" complaint. flexGrow on the contentContainer is the
        // equivalent ensurance for inner content layout.
        <FlatList<Notification>
          data={filtered}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={9}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              tintColor="#00CFFF"
            />
          }
          ListFooterComponent={
            unreadCount > 0 ? (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.markAllBtn}
                onPress={markAllRead}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.markAllText}>
                  {t.notifications.markAllRead}
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 20,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00CFFF',
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 11,
    color: '#0B0F16',
    lineHeight: 13,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#141823',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  // Subtle red tint on the trash icon button when there's something
  // to delete. Communicates the destructive nature without being so
  // loud that the user is afraid to tap it.
  iconBtnDestructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.30)',
  },
  // Fixed-height shell pins the horizontal tabs row to a deterministic
  // height so it never claims more column space than its content needs.
  tabsShell: {
    height: 46,
    marginBottom: 8,
  },
  tabsRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#141823',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    borderColor: 'rgba(0, 207, 255, 0.45)',
  },
  tabText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#8B95A8',
  },
  tabTextActive: {
    color: '#00CFFF',
    fontFamily: Fonts.inter.semiBold,
  },
  // `list` (= the FlatList outer style) gets flex:1 so the rows
  // start at the top of the available area and the scroll surface
  // stretches to the safe-area bottom. flexGrow on the inner content
  // container is a belt-and-braces guarantee that the empty space
  // below the rows still accepts the pull-to-refresh gesture.
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    paddingLeft: 16,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  cardUnread: {
    backgroundColor: 'rgba(0, 207, 255, 0.045)',
    borderColor: 'rgba(0, 207, 255, 0.18)',
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#00CFFF',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  titleUnread: {
    fontFamily: Fonts.inter.bold,
  },
  time: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#6B7280',
  },
  description: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    lineHeight: 17,
  },
  emptyScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 149, 168, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    color: Colors.text,
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 19,
  },
  markAllBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  markAllText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#00CFFF',
  },
});
