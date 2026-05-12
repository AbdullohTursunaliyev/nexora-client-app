import { useEffect, useRef, ReactNode } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

interface Props {
  children: ReactNode;
  delay?: number;
  duration?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
}

export default function FadeInView({
  children,
  delay = 0,
  duration = 360,
  translateY = 12,
  style,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(ty, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, ty, delay, duration]);

  return (
    <Animated.View
      style={[style, { opacity, transform: [{ translateY: ty }] }]}
    >
      {children}
    </Animated.View>
  );
}
