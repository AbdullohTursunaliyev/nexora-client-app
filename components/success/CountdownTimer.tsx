import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  /**
   * Seconds remaining when the timer mounts. Pre-fix the default was
   * `47 * 60 + 32` — every booking-success screen showed "47:32" as
   * "time until session" regardless of the real booking. Default
   * dropped to 0 so a caller that forgets to pass the prop gets a
   * harmless `00:00:00` instead of a fake countdown.
   */
  initialSeconds?: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function CountdownTimer({ initialSeconds = 0 }: Props) {
  const t = useT();
  const [seconds, setSeconds] = useState(initialSeconds);

  // Re-sync local state if the parent re-renders with a different
  // initialSeconds. Without this, a caller that fetches the booking
  // after mount and updates the prop would have it ignored — useState
  // only honours its initialiser on the first render.
  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t.components.countdownLabel}</Text>
      <View style={styles.row}>
        <View style={styles.unit}>
          <Text style={styles.value}>{pad(hh)}</Text>
          <Text style={styles.unitLabel}>{t.components.unitHours}</Text>
        </View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.unit}>
          <Text style={styles.value}>{pad(mm)}</Text>
          <Text style={styles.unitLabel}>{t.components.unitMinutes}</Text>
        </View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.unit}>
          <Text style={styles.value}>{pad(ss)}</Text>
          <Text style={styles.unitLabel}>{t.components.unitSeconds}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
  },
  label: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#8B95A8',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unit: {
    alignItems: 'center',
    minWidth: 56,
  },
  value: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 28,
    color: Colors.text,
    letterSpacing: 1,
  },
  unitLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  colon: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 24,
    color: '#3A4250',
    marginTop: -16,
  },
});
