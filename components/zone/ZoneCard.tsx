import { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';

interface Props {
  title: string;
  description: string;
  available: number;
  availableLabel: string;
  fullLabel: string;
  priceLabel: string;
  imageUri: string;
  selected?: boolean;
  onPress?: () => void;
}

export default function ZoneCard({
  title,
  description,
  available,
  availableLabel,
  fullLabel,
  priceLabel,
  imageUri,
  selected,
  onPress,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const isFull = available <= 0;

  const onPressIn = () => {
    if (isFull) return;
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  };

  const handlePress = () => {
    if (isFull) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isFull}
        accessibilityRole="button"
        accessibilityState={{ disabled: isFull, selected }}
        accessibilityLabel={`${title}, ${isFull ? fullLabel : availableLabel}, ${priceLabel}`}
        style={[
          styles.card,
          selected && styles.cardSelected,
          isFull && styles.cardDisabled,
        ]}
      >
        <View style={styles.imageWrap}>
          <Image source={{ uri: imageUri }} style={styles.image} />
          <LinearGradient
            colors={['rgba(11, 15, 22, 0)', 'rgba(11, 15, 22, 0.55)']}
            style={StyleSheet.absoluteFillObject}
          />
          {selected && (
            <View style={styles.selectedDot}>
              <Text style={styles.selectedDotText}>✓</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={[styles.availBadge, isFull && styles.fullBadge]}>
              <View style={[styles.availDot, isFull && styles.fullDot]} />
              <Text style={[styles.availText, isFull && styles.fullText]}>
                {isFull ? fullLabel : availableLabel}
              </Text>
            </View>
            <Text style={[styles.price, isFull && styles.priceDisabled]} numberOfLines={1}>
              {priceLabel}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // No shadow / elevation — selection state is communicated by the
  // cyan border on `cardSelected`; the dark slab already pops off the
  // surrounding background without help from an iOS shadow halo.
  card: {
    flexDirection: 'row',
    backgroundColor: '#141823',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#00CFFF',
    backgroundColor: 'rgba(0, 207, 255, 0.06)',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  imageWrap: {
    position: 'relative',
    width: 110,
    height: 130,
    overflow: 'hidden',
  },
  image: {
    width: 110,
    height: 130,
    backgroundColor: '#1A1F2B',
  },
  selectedDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00CFFF',
    alignItems: 'center',
    justifyContent: 'center',
    // No cyan glow — the solid fill against the card already reads
    // as "selected"; the halo competed with the card's own border.
  },
  selectedDotText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 12,
    color: '#0B0F16',
    lineHeight: 14,
  },
  content: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: Fonts.inter.bold,
    fontSize: 15.5,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  description: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    lineHeight: 17,
    color: '#8B95A8',
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fullBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  availDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00CFFF',
  },
  fullDot: {
    backgroundColor: '#EF4444',
  },
  availText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11,
    color: '#00CFFF',
  },
  fullText: {
    color: '#EF4444',
  },
  price: {
    fontFamily: Fonts.inter.bold,
    fontSize: 12.5,
    color: Colors.text,
    letterSpacing: -0.1,
    flexShrink: 0,
  },
  priceDisabled: {
    color: '#5A6A85',
  },
});
