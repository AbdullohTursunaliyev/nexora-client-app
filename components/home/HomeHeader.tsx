import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useAuth } from '../../store/AuthProvider';
import { useT } from '../../lib/i18n/LocaleProvider';
import BellIcon from '../icons/BellIcon';
import UserAvatar from '../common/UserAvatar';
import * as clientApi from '../../lib/api/services/client';
import * as notificationsApi from '../../lib/api/services/notifications';
import {
  msSinceLastUnreadMutation,
  setUnreadCount,
  useUnreadCount,
} from '../../lib/state/notificationUnread';

interface Props {
  /**
   * Optional override for the bell badge count. When omitted the
   * header fetches the unread total itself — keeps the parent simple
   * and avoids each consumer wiring its own listener.
   */
  unreadCount?: number;
  /**
   * Caller-supplied "refetch now" signal. Increment on pull-to-refresh
   * so the rank chip + bell badge sync without depending on focus
   * transitions. Without it, the home tab's pull-to-refresh only
   * touched the discover/auth caches; the header data went stale.
   */
  refreshKey?: number;
}

export default function HomeHeader({
  unreadCount: unreadOverride,
  refreshKey = 0,
}: Props = {}) {
  const { user, currentTenantId } = useAuth();
  const t = useT();
  // Default the rank to the "novice" tier — that's what the backend
  // hands out to every brand-new client. Hardcoding it client-side as
  // a fallback means the chip never disappears even before the
  // /client/summary fetch lands, and a user who hasn't switched into
  // any tenant still sees their starting level.
  const [rankName, setRankName] = useState<string>(t.home.levelDefault);
  const [rankColor, setRankColor] = useState<string>('#94A3B8');
  // Read the singleton via the subscribe hook so the badge updates
  // INSTANTLY when /notifications mutates state (tap-to-read /
  // mark-all-read). Pre-fix we had a local `unreadFetched` state that
  // only refetched on focus — leaving the badge stale during the
  // ~50ms BE round-trip after a read mutation.
  const unreadFromSingleton = useUnreadCount();

  // Pull the per-tenant rank from /mobile/client/summary. Only fires
  // when the user has actually switched into a tenant — otherwise
  // there's no client_token and the request would 401. On failure or
  // missing-rank shape we keep the novice default rather than hiding
  // the chip.
  //
  // Pre-fix `t` was in the deps array, which meant every locale flip
  // re-issued the API call even though the response body doesn't
  // depend on language. Removed — locale only affects the local
  // `levelDefault` fallback string, which is read inline on render.
  const fetchRank = useCallback((): (() => void) => {
    if (!currentTenantId) {
      // No tenant ⇒ render the novice fallback. Reset color too so
      // the chip doesn't carry stale tint from the previous tenant.
      setRankName(t.home.levelDefault);
      setRankColor('#94A3B8');
      return () => {};
    }
    let cancelled = false;
    clientApi
      .getSummary()
      .then((s) => {
        if (cancelled) return;
        const r = s?.rank?.current;
        if (r) {
          setRankName(r.name);
          setRankColor(r.color);
        }
      })
      .catch(() => {
        // Quiet — chip stays on the previous value.
      });
    return () => {
      cancelled = true;
    };
    // `t` intentionally excluded from deps; see docblock above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenantId]);

  useEffect(() => {
    const cleanup = fetchRank();
    return cleanup;
  }, [fetchRank, refreshKey]);

  // Real unread count for the bell badge. We pass the current tenant
  // (when available) so tenant-scoped notifications — booking confirms,
  // tournament reminders — feed the badge too, not just the rare
  // user-global ones. Without it the BE only returns notifications
  // where tenant_id IS NULL, which on a fresh demo is just the
  // welcome message.
  const fetchUnread = useCallback((): (() => void) => {
    let cancelled = false;
    notificationsApi
      .listNotifications(undefined, currentTenantId)
      .then((res) => {
        if (cancelled) return;
        // Prefer the BE-aggregated count — it includes paginated rows
        // we never fetched.
        const beUnread = typeof res.unread_count === 'number' ? res.unread_count : null;
        const fallback = (res.items ?? []).filter((n) => !n.read).length;
        // Write to the singleton (NOT a local state). Every consumer
        // — this header, the notifications screen, future widgets —
        // reads from the same memory cell and re-renders in lock-step.
        setUnreadCount(beUnread ?? fallback);
      })
      .catch(() => {
        // Quiet — keep the previous count on failure rather than
        // flashing 0 (which would read as "you have no unread" right
        // before the next successful poll bumps it back up).
      });
    return () => {
      cancelled = true;
    };
  }, [currentTenantId]);

  // Re-fetch the unread count whenever the screen regains focus —
  // EXCEPT when the user just optimistically cleared it on
  // /notifications. Critical UX: user taps the bell → reads + auto-
  // mark on /notifications → returns to home (button or swipe) → the
  // bell badge would otherwise refetch and briefly flash back to the
  // pre-read count while the BE processed the POST.
  //
  // The singleton's `msSinceLastUnreadMutation()` tells us how long
  // ago the user last mutated the count. Anything inside the 5s
  // stale-write window is skipped — the singleton's value is already
  // authoritative for the user's intent, and the BE will be settled
  // by the next legitimate focus/refresh.
  useFocusEffect(
    useCallback(() => {
      if (msSinceLastUnreadMutation() < 5_000) {
        // Skip — singleton is fresh enough. Pull-to-refresh on home
        // still works as an explicit override (it bumps refreshKey,
        // which the other effect below picks up).
        return undefined;
      }
      const cleanup = fetchUnread();
      return cleanup;
    }, [fetchUnread]),
  );

  // ALSO re-fetch on `refreshKey` bump (pull-to-refresh on home).
  // Focus doesn't change on pull-to-refresh, so we need a separate
  // trigger for that path.
  useEffect(() => {
    if (refreshKey === 0) return; // skip initial mount; useFocusEffect covers it
    const cleanup = fetchUnread();
    return cleanup;
  }, [refreshKey, fetchUnread]);

  const unreadCount = unreadOverride ?? unreadFromSingleton;

  // Pause the green online-dot pulse when the screen is unfocused —
  // an off-screen Animated.loop keeps the JS thread waking up every
  // 1.3s for no visible benefit. The focus hook stops / restarts it
  // around the user's actual viewing window so the dot still feels
  // alive when looked at, without burning battery in the background.
  const onlinePulse = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(onlinePulse, {
            toValue: 1,
            duration: 1300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(onlinePulse, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
      loopRef.current = loop;
      loop.start();
      return () => {
        loop.stop();
        loopRef.current = null;
      };
    }, [onlinePulse]),
  );

  const onlineRingOpacity = onlinePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });
  const onlineRingScale = onlinePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });

  const displayName = useMemo(() => {
    // i18n'd guest fallback — pre-fix the literal "Mehmon" stayed in
    // every locale (ru/en users saw the uz word).
    if (!user) return t.home.guestName;
    const fn = (user.first_name || '').trim();
    if (fn) return fn;
    return user.login;
  }, [user, t]);

  // Greeting is recomputed on focus too so a user who left the app at
  // 17:55 and comes back at 18:05 sees "Evening" instead of stale
  // "Afternoon". Computed via state + setter so the focus callback
  // can update it without forcing a parent re-render.
  const computeGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 6) return { text: t.home.greetingNight, emoji: '🌙' };
    if (hour < 12) return { text: t.home.greetingMorning, emoji: '☀️' };
    if (hour < 18) return { text: t.home.greetingDay, emoji: '🌤️' };
    return { text: t.home.greetingEvening, emoji: '🌆' };
  }, [t]);
  const [greeting, setGreeting] = useState(computeGreeting);
  useFocusEffect(
    useCallback(() => {
      setGreeting(computeGreeting());
    }, [computeGreeting]),
  );

  const showBadge = unreadCount > 0;
  // Cap the badge at 99+ rather than the prior 9+ — modern social
  // apps use 99+ as the universal "lots of unread" sentinel and 9+
  // looks oddly small for an active user.
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.push('/(tabs)/profile')}
        style={styles.avatarBtn}
        accessibilityRole="button"
        accessibilityLabel={t.home.openProfileA11y}
      >
        <UserAvatar avatarUrl={user?.avatar_url} size={38} ring />
        <View style={styles.onlineDotWrap}>
          <Animated.View
            style={[
              styles.onlinePulseRing,
              {
                opacity: onlineRingOpacity,
                transform: [{ scale: onlineRingScale }],
              },
            ]}
          />
          <View style={styles.onlineDot} />
        </View>
      </TouchableOpacity>

      <View style={styles.info}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting.text}
          </Text>
          <Text style={styles.greetingEmoji}>{greeting.emoji}</Text>
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <View
            style={[
              styles.levelChip,
              {
                backgroundColor: hexToRgba(rankColor, 0.16),
                borderColor: hexToRgba(rankColor, 0.35),
              },
            ]}
          >
            <Text
              style={[styles.levelText, { color: rankColor }]}
              numberOfLines={1}
            >
              {rankName}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.bellBtn, showBadge && styles.bellBtnActive]}
        activeOpacity={0.75}
        onPress={() => router.push('/notifications')}
        accessibilityRole="button"
        accessibilityLabel={
          showBadge
            ? t.home.bellWithUnreadA11y.replace('{n}', badgeLabel)
            : t.home.bellA11y
        }
      >
        <BellIcon size={20} color={showBadge ? '#00CFFF' : Colors.text} />
        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

/** Hex → rgba helper for the rank chip's BE-supplied colour. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(167, 139, 250, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
    gap: 12,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  onlineDotWrap: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlinePulseRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#080F16',
  },
  info: {
    flex: 1,
    gap: 5,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  greeting: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    lineHeight: 14,
    color: '#8B95A8',
    letterSpacing: 0.1,
  },
  greetingEmoji: {
    fontSize: 12.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  levelChip: {
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 7,
  },
  levelText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 10.5,
    color: '#A78BFA',
    letterSpacing: 0.3,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bellBtnActive: {
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
    borderColor: 'rgba(0, 207, 255, 0.35)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#080F16',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 10,
    color: '#FFFFFF',
    lineHeight: 12,
  },
});
