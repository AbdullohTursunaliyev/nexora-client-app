import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  type GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';
import TabHomeIcon from '../icons/TabHomeIcon';
import TabDiscoverIcon from '../icons/TabDiscoverIcon';
import TabWalletIcon from '../icons/TabWalletIcon';
import TabProfileIcon from '../icons/TabProfileIcon';
import QrIcon from '../icons/QrIcon';

const ACTIVE = '#00CFFF';
const INACTIVE = '#6B7280';

/**
 * Names of the four navigation tabs we render. Order here is the
 * order they appear in the bar — `home` and `discover` flank the
 * left side of the centre FAB, `wallet` and `profile` flank the
 * right. Any other tab registered in `(tabs)` is treated as
 * "hidden from bar" and is reachable only by deep-link / quick-link
 * (e.g. `bookings` is opened via the Profile quick-link).
 */
const VISIBLE_TABS = ['index', 'discover', 'wallet', 'profile'] as const;
type VisibleTabName = (typeof VISIBLE_TABS)[number];

/**
 * Custom bottom tab bar with a raised central QR action button.
 *
 * Design philosophy: the QR scanner is the single most discoverable
 * "do something now" action in the app — every PC at the club has a
 * QR sticker, every booking confirmation surfaces one. Anchoring it
 * to the centre of the tab bar with a slightly larger, glowing pill
 * matches the convention modern social/utility apps (Instagram,
 * Telegram, etc.) use for their primary action.
 *
 * Bookings was removed from the tab bar in this redesign — it's
 * still a real route under `(tabs)/bookings`, but `Tabs.Screen
 * options={{href: null}}` hides it from the bar. The Profile screen
 * already exposes a "My bookings" quick-link card and the home tab
 * lists upcoming bookings, so the dedicated tab slot was redundant
 * once the centre had to carry the QR action.
 *
 * Accessibility:
 *   - Each tab pill is `accessibilityRole="tab"` with the selected
 *     state mirrored so screen readers announce focus correctly.
 *   - The QR FAB is a separate `accessibilityRole="button"` with a
 *     localised hint, because semantically it's an action, not
 *     navigation between two stack states.
 */
export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useT();
  const insets = useSafeAreaInsets();

  // Filter to the explicitly-listed visible tabs in their declared
  // order. We can't rely on `state.routes` order alone because
  // expo-router's auto-registration is alphabetical, which would
  // surface (in a fresh build): bookings, discover, index, profile,
  // wallet — not the UX-tested order Home / Discover / Wallet /
  // Profile.
  const orderedTabs = useMemo(() => {
    const byName = new Map(state.routes.map((r, i) => [r.name, { route: r, index: i }]));
    return VISIBLE_TABS.flatMap((name) => {
      const entry = byName.get(name);
      return entry ? [entry] : [];
    });
  }, [state.routes]);

  // The QR slot is anchored to the middle of the rendered tab list,
  // not the middle of `orderedTabs`. With 4 visible tabs we want the
  // visual order: Home, Discover, [QR], Wallet, Profile. Splitting on
  // index 2 puts the FAB exactly in the centre.
  const leftTabs = orderedTabs.slice(0, 2);
  const rightTabs = orderedTabs.slice(2);

  const renderTab = (entry: { route: { name: string; key: string }; index: number }) => {
    const { route, index } = entry;
    const isFocused = state.index === index;
    const descriptor = descriptors[route.key];

    const onPress = (e: GestureResponderEvent) => {
      // Mirror react-navigation's default tab press behaviour:
      //   - Fire `tabPress` event so listeners (e.g. scroll-to-top
      //     handlers) can react.
      //   - If the event wasn't defaultPrevented and the tab isn't
      //     already focused, navigate.
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name as never);
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync().catch(() => {});
        }
      }
    };

    const onLongPress = () => {
      navigation.emit({ type: 'tabLongPress', target: route.key });
    };

    const Icon = iconForTab(route.name as VisibleTabName);
    const label = labelForTab(route.name as VisibleTabName, t);
    const color = isFocused ? ACTIVE : INACTIVE;

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={label}
        // Pre-fix audit: tab targets were ~48pt wide which fell short
        // of the 60pt comfortable-tap target on phablet-sized devices.
        // hitSlop adds an extra ~6pt of receptive area without changing
        // the visual size.
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        style={styles.tab}
        // Don't ripple android — keeps the bar visually consistent
        // with iOS which uses opacity feedback only.
        android_ripple={undefined}
      >
        <Icon
          size={22}
          color={color}
          // `filled` is only meaningful for icons that expose a
          // filled variant (TabHomeIcon, TabWalletIcon). The others
          // ignore it via destructuring.
          filled={isFocused}
        />
        <Text
          style={[styles.label, { color }, isFocused && styles.labelActive]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const onPressQr = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    router.push('/qr-scan');
  };

  // Guarantee at least 16pt of breathing room below the labels even
  // when the OS reports a smaller `insets.bottom` (some Android OEMs +
  // edge-to-edge modes round the gesture-pill inset down). Without this
  // floor the labels visually clipped against the phone's gesture pill
  // on the screenshot the user shared — "Сканер" and "Кошелёк" sat
  // directly on top of the system bar.
  const safeBottom = Math.max(insets.bottom, 16);

  return (
    <View
      style={[
        styles.bar,
        {
          height: 60 + safeBottom,
          paddingBottom: safeBottom,
        },
      ]}
    >
      {leftTabs.map(renderTab)}

      {/* Centre QR FAB. Renders as a slot in the flex row so left/right
          tabs split evenly around it. `marginTop: -18` lifts the pill
          above the bar's baseline — the visual "raised" affordance that
          tells users this isn't just another tab. */}
      <View style={styles.qrSlot}>
        <Pressable
          onPress={onPressQr}
          accessibilityRole="button"
          accessibilityLabel={t.tabs.scanQrA11y}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => [
            styles.qrPressable,
            pressed && styles.qrPressableActive,
          ]}
        >
          <LinearGradient
            colors={['#00CFFF', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.qrButton}
          >
            <QrIcon size={26} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.qrLabel} numberOfLines={1}>
            {t.tabs.scanQr}
          </Text>
        </Pressable>
      </View>

      {rightTabs.map(renderTab)}
    </View>
  );
}

function iconForTab(name: VisibleTabName) {
  switch (name) {
    case 'index':
      return TabHomeIcon;
    case 'discover':
      return TabDiscoverIcon;
    case 'wallet':
      return TabWalletIcon;
    case 'profile':
      return TabProfileIcon;
  }
}

function labelForTab(name: VisibleTabName, t: ReturnType<typeof useT>) {
  switch (name) {
    case 'index':
      return t.tabs.home;
    case 'discover':
      return t.tabs.discover;
    case 'wallet':
      return t.tabs.wallet;
    case 'profile':
      return t.tabs.profile;
  }
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
    paddingHorizontal: 4,
    // `overflow: visible` lets the raised QR FAB stick out above the
    // bar's top edge. Without it the FAB's negative marginTop would
    // get clipped on Android.
    overflow: 'visible',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    paddingTop: 4,
  },
  label: {
    fontFamily: Fonts.inter.medium,
    fontSize: 10.5,
    textAlign: 'center',
  },
  labelActive: {
    fontFamily: Fonts.inter.semiBold,
  },
  qrSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  qrPressable: {
    alignItems: 'center',
    // Lift the whole pressable so the gradient pill protrudes above
    // the bar baseline AND the label below the pill sits at the SAME
    // vertical position as the other tab labels (38pt from bar top).
    //
    // Math: other tabs render label at `tab.paddingTop (4) + icon (22)
    // + gap (4) = 30pt` below their pressable origin. QR has button
    // (54) + gap (4) before its label = 58pt — so the QR pressable
    // origin must be 28pt above the other tab origins to land its
    // label on the same row. Pre-fix this was -22, leaving the "Скан"
    // label 6pt lower than the rest and dropping it into the gesture-
    // pill clearance zone on Android.
    marginTop: -28,
    gap: 4,
  },
  qrPressableActive: {
    // Subtle scale-down on press; conveys depth without needing
    // platform-specific ripples.
    transform: [{ scale: 0.94 }],
  },
  qrButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    // Cyan glow ring — uses iOS shadow + Android elevation. The
    // gradient pill already reads as the primary action; the glow
    // is just a soft halo cue.
    shadowColor: '#00CFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  qrLabel: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 10.5,
    color: ACTIVE,
    textAlign: 'center',
  },
});
