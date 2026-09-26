import { useMemo, useRef } from 'react';
import { Animated, Platform, type View } from 'react-native';

// ---------------------------------------------------------------------------
// SCROLL-SYNCED HEADER (native only)
// Keeps a header track (hour labels, location names) locked to a horizontal
// ScrollView's offset with a native-driver Animated transform, so it moves
// entirely off the JS thread.
//
// The timelines don't use this on web: there is no native driver there, and
// moving a header from scroll events restyles and repaints the page on every
// frame. Web pins its headers with CSS `position: sticky` instead (see the
// web branches of HorizontalTimeline and VerticalTimeline).
// ---------------------------------------------------------------------------
export function useScrollSyncedHeader() {
  const scrollX = useRef(new Animated.Value(0)).current;
  const trackRef = useRef<View>(null);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        // Always true where this is attached; guarded so merely calling the
        // hook on web doesn't trip Animated's "native driver unsupported"
        // warning.
        useNativeDriver: Platform.OS !== 'web',
      }),
    [scrollX]
  );

  const trackStyle = useMemo(
    () => ({ transform: [{ translateX: Animated.multiply(scrollX, -1) }] }),
    [scrollX]
  );

  return { onScroll, trackRef, trackStyle };
}
