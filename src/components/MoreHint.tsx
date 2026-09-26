import {
  forwardRef,
  useContext,
  useImperativeHandle,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemeContext } from '../theme/ThemeContext';
import { withAlpha } from '../utils/colors';

export type MoreHintHandle = {
  setCount: (count: number) => void;
};

// ---------------------------------------------------------------------------
// MORE HINT
// "N more ›" / "N more ⌄" pill telling people there are rinks off-screen,
// overlaid on the timeline (not inside its scrolling content).
//
// It owns its count and is updated through a ref (`setCount`), so a new
// count re-renders only this pill, never the timeline. The timelines only
// call setCount when visibility actually changes: on web from an
// IntersectionObserver (no work at all while scrolling), on native from the
// scroll listener.
// ---------------------------------------------------------------------------
export const MoreHint = forwardRef<
  MoreHintHandle,
  {
    // 'right': top-right of the vertical view, over the location header.
    // 'down': bottom of the horizontal view's location column.
    direction: 'right' | 'down';
    onPress: () => void;
  }
>(function MoreHint({ direction, onPress }, ref) {
  const { styles, colors: UI } = useContext(ThemeContext);
  const [count, setCount] = useState(0);

  useImperativeHandle(
    ref,
    () => ({
      setCount: (next) => setCount((current) => (current === next ? current : next)),
    }),
    []
  );

  if (count <= 0) return null;

  const pill = (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Scroll to see ${count} more ${count === 1 ? 'rink' : 'rinks'}`}
      style={styles.morePill}>
      <Text style={styles.morePillText}>{count} more</Text>
      <Ionicons
        name={direction === 'right' ? 'chevron-forward' : 'chevron-down'}
        size={13}
        color={UI.accentText}
      />
    </Pressable>
  );

  if (direction === 'right') {
    return (
      <View style={styles.moreHintRight} pointerEvents="box-none">
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(UI.surfaceAlt, 0), UI.surfaceAlt]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.moreHintRightFade}
        />
        <View style={styles.moreHintRightBacking}>{pill}</View>
      </View>
    );
  }

  return (
    <View style={styles.moreHintDown} pointerEvents="box-none">
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(UI.surface, 0), UI.surface]}
        style={StyleSheet.absoluteFill}
      />
      {pill}
    </View>
  );
});
