import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';
import GamepadIcon from '../icons/GamepadIcon';
import MonitorIcon from '../icons/MonitorIcon';
import ClockIcon from '../icons/ClockIcon';
import CardIcon from '../icons/CardIcon';

export type BookingStep = 'zone' | 'seat' | 'time' | 'pay';

interface Props {
  current: BookingStep;
}

type IconCmp = React.ComponentType<{ size?: number; color?: string }>;

export default function BookingBreadcrumb({ current }: Props) {
  const t = useT();

  const STEPS: { key: BookingStep; label: string; Icon: IconCmp }[] = [
    { key: 'zone', label: t.components.breadcrumbZone, Icon: GamepadIcon },
    { key: 'seat', label: t.components.breadcrumbSeat, Icon: MonitorIcon },
    { key: 'time', label: t.components.breadcrumbTime, Icon: ClockIcon },
    { key: 'pay', label: t.components.breadcrumbPay, Icon: CardIcon },
  ];

  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <View style={styles.row}>
      {STEPS.map((step, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const dotColor = isCurrent ? '#080F16' : isPast ? '#00CFFF' : '#5A6A85';
        return (
          <View key={step.key} style={styles.stepWrap}>
            <View
              style={[
                styles.dot,
                isPast && styles.dotPast,
                isCurrent && styles.dotCurrent,
              ]}
            >
              <step.Icon size={13} color={dotColor} />
            </View>
            <Text
              style={[
                styles.label,
                isPast && styles.labelPast,
                isCurrent && styles.labelCurrent,
              ]}
            >
              {step.label}
            </Text>
            {idx < STEPS.length - 1 && (
              <View style={[styles.line, isPast && styles.linePast]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  stepWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#141823',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPast: {
    backgroundColor: 'rgba(0, 207, 255, 0.18)',
    borderColor: 'rgba(0, 207, 255, 0.5)',
  },
  dotCurrent: {
    backgroundColor: '#00CFFF',
    borderColor: '#00CFFF',
  },
  label: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11,
    color: '#5A6A85',
    marginLeft: 6,
  },
  labelPast: {
    color: '#8B95A8',
  },
  labelCurrent: {
    color: Colors.text,
    fontFamily: Fonts.inter.semiBold,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 8,
  },
  linePast: {
    backgroundColor: 'rgba(0, 207, 255, 0.4)',
  },
});
