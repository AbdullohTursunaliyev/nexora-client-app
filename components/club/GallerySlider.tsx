import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CloseIcon from '../icons/CloseIcon';
import ChevronRightIcon from '../icons/ChevronRightIcon';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

/**
 * Full-screen lightbox slider for club gallery photos.
 *
 * Built as a paged horizontal FlatList over Image so we don't pull in
 * a heavy image-zoom dependency. Behaviours:
 *
 *   - Opens at `initialIndex` (defaults to 0) and scrolls there before
 *     paint via `initialScrollIndex` so the user lands on the photo
 *     they tapped, not page 1.
 *   - Counter chip ("3 / 8") updates as the user swipes; tracked from
 *     `onMomentumScrollEnd` so it doesn't flicker on every pixel.
 *   - Tap on the dark padding outside the image (or the close button)
 *     dismisses; the image itself eats taps so the user can briefly
 *     focus on a photo without closing.
 *   - StatusBar is dimmed via `<Modal statusBarTranslucent />` so the
 *     bezel-area behind the system clock stays consistent with the
 *     black backdrop on Android.
 *   - Prev/Next chevrons are visible on tablets / large screens where
 *     swipe-paging feels slow; on phones the swipe gesture dominates
 *     but the chevrons remain a no-cost fallback.
 *
 * Width is recomputed from `Dimensions.get('window')` on each render —
 * that's enough for orientation changes (rare in this flow) and keeps
 * us off the more involved `useWindowDimensions` hook which would
 * cause an extra render on every orientation tick.
 */
export default function GallerySlider({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width: screenW } = Dimensions.get('window');
  const listRef = useRef<FlatList<string>>(null);

  // Clamp the requested initial index so a stale caller can't blow
  // up `getItemLayout` / `initialScrollIndex` with an out-of-range
  // value when the gallery shrinks between opens.
  const safeInitial = Math.max(0, Math.min(initialIndex, Math.max(images.length - 1, 0)));
  const [activeIndex, setActiveIndex] = useState(safeInitial);

  // When the caller re-opens the slider at a different index (e.g. user
  // tapped the second thumbnail after closing once), sync our local
  // active-index back to the prop. Without this the counter would stay
  // on the previous open's last page.
  useEffect(() => {
    if (visible) {
      setActiveIndex(safeInitial);
      // Defer scrollToIndex one tick: on iOS the list isn't laid out yet
      // on the first frame so the call would no-op silently. The
      // `initialScrollIndex` already covers paint, this just covers the
      // "re-open at different index" case.
      const id = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: safeInitial, animated: false });
      }, 0);
      return () => clearTimeout(id);
    }
  }, [visible, safeInitial]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / screenW);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  const goPrev = () => {
    const next = Math.max(0, activeIndex - 1);
    if (next !== activeIndex) {
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }
  };
  const goNext = () => {
    const next = Math.min(images.length - 1, activeIndex + 1);
    if (next !== activeIndex) {
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }
  };

  const counter = t.clubDetails.galleryCounter
    .replace('{current}', String(activeIndex + 1))
    .replace('{total}', String(images.length));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.root}>
        {/* Top overlay: counter + close. Sits above the FlatList so the
            tap targets win against the swipe gesture. */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>{counter}</Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t.clubDetails.galleryCloseA11y}
          >
            <CloseIcon size={20} color={Colors.white} />
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(_, i) => `img-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={safeInitial}
          getItemLayout={(_, index) => ({
            length: screenW,
            offset: screenW * index,
            index,
          })}
          onMomentumScrollEnd={onMomentumEnd}
          renderItem={({ item }) => (
            // Pressable on the outer padding closes; the inner image
            // stops propagation so a tap on the photo itself is a
            // no-op (avoids accidental close while inspecting).
            <Pressable
              style={[styles.page, { width: screenW }]}
              onPress={onClose}
            >
              <Pressable onPress={() => {}}>
                <Image
                  source={{ uri: item }}
                  style={[styles.image, { width: screenW - 32 }]}
                  resizeMode="contain"
                />
              </Pressable>
            </Pressable>
          )}
        />

        {/* Prev / Next chevrons. Hidden at the boundary to make the
            "no further pages" state visually obvious instead of letting
            the user tap a no-op control. */}
        {images.length > 1 && activeIndex > 0 && (
          <Pressable
            onPress={goPrev}
            hitSlop={10}
            style={[styles.chevron, styles.chevronLeft]}
            accessibilityRole="button"
          >
            <View style={styles.chevronInner}>
              <ChevronRightIcon size={18} color={Colors.white} />
              {/* Mirror the right-chevron icon via rotation rather than
                  shipping a second icon component. */}
            </View>
          </Pressable>
        )}
        {images.length > 1 && activeIndex < images.length - 1 && (
          <Pressable
            onPress={goNext}
            hitSlop={10}
            style={[styles.chevron, styles.chevronRight]}
            accessibilityRole="button"
          >
            <View style={styles.chevronInner}>
              <ChevronRightIcon size={18} color={Colors.white} />
            </View>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  counterPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  counterText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  image: {
    aspectRatio: 1,
    maxHeight: '85%',
    borderRadius: 14,
    backgroundColor: '#0B0F16',
  },
  chevron: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
  },
  chevronLeft: {
    left: 8,
    transform: [{ scaleX: -1 }],
  },
  chevronRight: {
    right: 8,
  },
  chevronInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
