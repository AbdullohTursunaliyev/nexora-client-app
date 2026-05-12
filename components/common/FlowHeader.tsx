import { Fragment, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import BackIcon from '../icons/BackIcon';

interface Props {
  step: number;
  totalSteps?: number;
}

const DOT_SIZE = 8;
const CURRENT_SIZE = 12;

export default function FlowHeader({ step, totalSteps = 4 }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const currentScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const currentOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.back}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <BackIcon size={20} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.stepper}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const num = i + 1;
          const isPast = num < step;
          const isCurrent = num === step;
          return (
            <Fragment key={i}>
              <View style={styles.dotWrap}>
                {isCurrent && (
                  <Animated.View
                    style={[
                      styles.pulseRing,
                      {
                        opacity: currentOpacity,
                        transform: [{ scale: currentScale }],
                      },
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.dot,
                    isPast && styles.dotPast,
                    isCurrent && styles.dotCurrent,
                  ]}
                />
              </View>
              {i < totalSteps - 1 && (
                <View style={[styles.line, num <= step - 1 && styles.linePast]} />
              )}
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 14,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#141823',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotWrap: {
    width: CURRENT_SIZE + 8,
    height: CURRENT_SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: CURRENT_SIZE + 8,
    height: CURRENT_SIZE + 8,
    borderRadius: (CURRENT_SIZE + 8) / 2,
    backgroundColor: '#00CFFF',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#1F2533',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dotPast: {
    backgroundColor: '#00CFFF',
    borderColor: '#00CFFF',
  },
  dotCurrent: {
    width: CURRENT_SIZE,
    height: CURRENT_SIZE,
    borderRadius: CURRENT_SIZE / 2,
    backgroundColor: '#00CFFF',
    borderColor: '#00CFFF',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 1,
  },
  linePast: {
    backgroundColor: '#00CFFF',
  },
});
