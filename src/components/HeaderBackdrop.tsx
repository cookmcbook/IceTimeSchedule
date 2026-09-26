import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  HEADER_FADE_ALPHAS,
  HEADER_FADE_FRACTION,
  HEADER_TITLE_ZONE,
  THEME_TRANSITION_MS,
} from '../constants';
import { DARK_UI, LIGHT_UI } from '../theme/colors';
import { withAlpha } from '../utils/colors';

// Cropped and compressed from the Unsplash originals in the project root
// (~1000px wide, about 100 KB or less each) so they don't bloat the web
// bundle. Header images are 3:2 so `cover` can fill any header size while
// staying vertically centered on the subject.
const HEADER_HOCKEY_IMAGE = require('../../assets/images/header-hockey.jpg');
const HEADER_SKATER_IMAGE = require('../../assets/images/header-skater.jpg');

// ---------------------------------------------------------------------------
// HEADER BACKDROP
// The header photo plus the fade that blends it into the theme background:
// figure skater on the dark arena for dark mode, hockey player on bright ice
// for light mode.
//
// Both versions are always rendered, stacked: light on the bottom, dark on
// top. Switching themes fades the dark layer in or out, a true crossfade
// with no dip in brightness halfway through. Each layer carries its own
// fade gradient in its own theme's background color, so the gradient
// crossfades along with the photo.
//
// The photo is always exactly header-height tall and pinned right, so its
// subject is never cropped: on phones only its empty left edge overflows,
// and on wide screens the theme background fills the space to its left.
// ---------------------------------------------------------------------------
export function HeaderBackdrop({
  isDarkMode,
  width,
  height,
}: {
  isDarkMode: boolean;
  width: number;
  height: number;
}) {
  // 1 = dark layer fully shown, 0 = hidden (light layer shows through).
  const darkOpacity = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(darkOpacity, {
      toValue: isDarkMode ? 1 : 0,
      duration: THEME_TRANSITION_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [isDarkMode, darkOpacity]);

  const imageWidth = height * 3;

  // One smooth gradient: solid theme background up to where the photo
  // starts, then an eased fade to clear across the photo's (pre-blurred)
  // empty left side. Always reaches past the title so it stays readable.
  const fade = useMemo(() => {
    const fadeStart = Math.max(0, width - imageWidth);
    const fadeEnd = Math.max(
      HEADER_TITLE_ZONE,
      fadeStart + imageWidth * HEADER_FADE_FRACTION
    );
    const solidUntil = fadeStart / fadeEnd;
    // HEADER_FADE_ALPHAS has 7 entries, satisfying LinearGradient's
    // "at least two stops" tuple types.
    const colorsFor = (bg: string) =>
      HEADER_FADE_ALPHAS.map((alpha) => withAlpha(bg, alpha)) as unknown as readonly [
        string,
        string,
        ...string[],
      ];
    return {
      width: fadeEnd,
      dark: colorsFor(DARK_UI.bg),
      light: colorsFor(LIGHT_UI.bg),
      locations: HEADER_FADE_ALPHAS.map(
        (_, index) =>
          solidUntil + (1 - solidUntil) * (index / (HEADER_FADE_ALPHAS.length - 1))
      ) as unknown as readonly [number, number, ...number[]],
    };
  }, [width, imageWidth]);

  const layer = (image: number, colors: readonly [string, string, ...string[]]) => (
    <>
      <Image
        source={image}
        resizeMode="cover"
        style={[styles.image, { width: imageWidth, height }]}
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={colors}
        locations={fade.locations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fade, { width: fade.width }]}
      />
    </>
  );

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: LIGHT_UI.bg }]}>
        {layer(HEADER_HOCKEY_IMAGE, fade.light)}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: DARK_UI.bg, opacity: darkOpacity },
        ]}>
        {layer(HEADER_SKATER_IMAGE, fade.dark)}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
});
