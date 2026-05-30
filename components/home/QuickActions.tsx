import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import MonitorIcon from '../icons/MonitorIcon';
import GamepadIcon from '../icons/GamepadIcon';
import TrophyIcon from '../icons/TrophyIcon';
import WalletIcon from '../icons/WalletIcon';
import { useT } from '../../lib/i18n/LocaleProvider';

type QuickAction = {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  /** Destination route, or undefined for actions still being wired up. */
  route?: Href;
};

export default function QuickActions() {
  const t = useT();

  // Only "Top up" has a live destination today — it routes to the
  // self-service top-up flow (provider-gated on the BE). The other three
  // stay label-only until their flows land; without a `route` the tile
  // renders disabled rather than no-op'ing on tap (avoids the "I pressed
  // it and nothing happened" trap).
  const ACTIONS: QuickAction[] = [
    { id: 'book', label: t.components.qaBook, Icon: MonitorIcon },
    { id: 'ps', label: t.components.qaPs, Icon: GamepadIcon },
    { id: 'tournaments', label: t.components.qaTournaments, Icon: TrophyIcon },
    { id: 'topup', label: t.components.qaTopup, Icon: WalletIcon, route: '/wallet-topup' },
  ];

  return (
    <View style={styles.row}>
      {ACTIONS.map(({ id, label, Icon, route }) => {
        const enabled = route !== undefined;
        return (
          <TouchableOpacity
            key={id}
            style={[styles.item, !enabled && styles.itemDisabled]}
            activeOpacity={0.7}
            disabled={!enabled}
            onPress={enabled ? () => router.push(route) : undefined}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: !enabled }}
          >
            <LinearGradient
              colors={['#7C3AED', '#3B5BF5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBg}
            >
              <Icon size={20} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.label}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  item: {
    flex: 1,
    backgroundColor: '#141823',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11.5,
    color: Colors.text,
    textAlign: 'center',
  },
});
