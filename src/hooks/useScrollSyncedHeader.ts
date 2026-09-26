import { useMemo, useRef } from 'react';
import {
  Animated,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type View,
} from 'react-native';

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
//
// `onOffset` (optional) receives each x offset on the JS side, for cheap
// bookkeeping like the "N more" count. The header itself doesn't wait on it.
// ---------------------------------------------------------------------------
export function useScrollSyncedHeader(onOffset?: (x: number) => void) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const trackRef = useRef<View>(null);
  const onOffsetRef = useRef(onOffset);
  onOffsetRef.current = onOffset;
  const hasListener = onOffset !== undefined;

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        // Always true where this is attached; guarded so merely calling the
        // hook on web doesn't trip Animated's "native driver unsupported"
        // warning.
        useNativeDriver: Platform.OS !== 'web',
        listener: hasListener
          ? (event: NativeSyntheticEvent<NativeScrollEvent>) =>
              onOffsetRef.current?.(event.nativeEvent.contentOffset.x)
          : undefined,
      }),
    [scrollX, hasListener]
  );

  const trackStyle = useMemo(
    () => ({ transform: [{ translateX: Animated.multiply(scrollX, -1) }] }),
    [scrollX]
  );

  return { onScroll, trackRef, trackStyle };
}
