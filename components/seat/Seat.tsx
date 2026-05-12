import { useEffect, useRef } from 'react';
import { Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';

export type SeatStatus = 'available' | 'taken' | 'selected';

interface Props {
  id: string;
  status: SeatStatus;
  /**
   * Tile width in dp. Defaults to 54 (the design baseline) but
   * `seat-select` passes a smaller value on narrow devices so a row of
   * 10 seats + aisle still fits inside the safe area on iPhone SE
   * (320 dp). Touch target is preserved by hitSlop on the Pressable.
   */
  size?: number;
  onPress?: () => void;
}

export default function Seat({ id, status, size = 54, onPress }: Props) {
  const isTaken = status === 'taken';
  const isSelected = status === 'selected';
  const scale = useRef(new Animated.Value(1)).current;

  // Pulse the selected seat once when it becomes selected
  useEffect(() => {
    if (!isSelected) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.12, duration: 140, useNativeDriver: true }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 8,
      }),
    ]).start();
  }, [isSelected, scale]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        isTaken
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => {});
    }
    onPress?.();
  };

  // Scale down the visual height proportionally so the tile keeps a
  // ~1.17:1 aspect ratio across sizes. Font shrinks below 40 so the
  // label still fits cleanly on iPhone SE.
  const height = Math.round(size * (46 / 54));
  const fontSize = size >= 44 ? 12.5 : size >= 36 ? 11 : 10;
  // Hitslop fills the missing pixels on small tiles so the touch
  // target stays >= ~44 dp (iOS HIG target).
  const slop = Math.max(0, Math.round((44 - size) / 2));

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        hitSlop={slop}
        style={[
          styles.seat,
          { width: size, height, borderRadius: size <= 36 ? 7 : 10 },
          status === 'available' && styles.available,
          isTaken && styles.taken,
          isSelected && styles.selected,
        ]}
      >
        <Text
          style={[
            styles.label,
            { fontSize },
            status === 'available' && styles.labelAvailable,
            isTaken && styles.labelTaken,
            isSelected && styles.labelSelected,
          ]}
        >
          {id}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  seat: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  available: {
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderColor: '#22C55E',
  },
  taken: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderColor: '#EF4444',
  },
  selected: {
    backgroundColor: '#00CFFF',
    borderColor: '#00CFFF',
    // No glow — the cyan fill + border already mark the seat as
    // selected. The previous shadow halo doubled the visual weight
    // and made dense seat grids look noisy.
  },
  label: {
    fontFamily: Fonts.inter.semiBold,
  },
  labelAvailable: {
    color: '#22C55E',
  },
  labelTaken: {
    color: '#EF4444',
  },
  labelSelected: {
    color: '#0B0F16',
    fontFamily: Fonts.inter.bold,
  },
});
