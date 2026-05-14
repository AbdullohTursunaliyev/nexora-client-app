import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { STORAGE_KEYS } from '../lib/api/config';
import OnboardingPage1 from '../components/onboarding/OnboardingPage1';
import OnboardingPage2 from '../components/onboarding/OnboardingPage2';
import OnboardingPage3 from '../components/onboarding/OnboardingPage3';
import ArrowRightIcon from '../components/icons/ArrowRightIcon';
import { useT } from '../lib/i18n/LocaleProvider';

const PAGE_COUNT = 3;

export default function OnboardingScreen() {
  const t = useT();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  // useWindowDimensions re-renders on orientation / split-screen / fold
  // changes (RESP-H5). Pre-fix the values were captured once at module
  // load — rotating an iPad mid-onboarding left pages sized for the
  // wrong viewport with horizontal black bars.
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== page) setPage(idx);
  };

  const goNext = () => {
    if (page < PAGE_COUNT - 1) {
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * (page + 1), animated: true });
    } else {
      finish();
    }
  };

  const finish = async () => {
    // Swallow AsyncStorage write errors so a flaky native storage
    // layer can't trap the user in onboarding forever. Worst case
    // they see the slides again on next launch — far better than the
    // screen freezing on a rejected promise.
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');
    } catch {
      // ignore
    }
    router.replace('/login');
  };

  const skip = () => finish();

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        <OnboardingPage1 width={SCREEN_WIDTH} height={SCREEN_HEIGHT} />
        <OnboardingPage2 width={SCREEN_WIDTH} height={SCREEN_HEIGHT} />
        <OnboardingPage3 width={SCREEN_WIDTH} height={SCREEN_HEIGHT} />
      </ScrollView>

      {page > 0 && (
        <SafeAreaView style={styles.skipBar} edges={['top']} pointerEvents="box-none">
          <TouchableOpacity onPress={skip} hitSlop={10} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t.onboarding.skip}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      <SafeAreaView style={styles.bottomBar} edges={['bottom']} pointerEvents="box-none">
        <View style={styles.dots}>
          {Array.from({ length: PAGE_COUNT }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>

        {page > 0 && (
          <TouchableOpacity activeOpacity={0.85} onPress={goNext}>
            <LinearGradient
              colors={['#00CFFF', '#3B5BF5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextBtn}
            >
              <ArrowRightIcon size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13.5,
    color: '#8B95A8',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingBottom: 24,
    paddingTop: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#00CFFF',
  },
  nextBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
