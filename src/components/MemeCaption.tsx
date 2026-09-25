import { useContext } from 'react';
import { Text, View } from 'react-native';

import { ThemeContext } from '../theme/ThemeContext';

// ---------------------------------------------------------------------------
// MEME CAPTION
// Classic 2012 image-macro text: white all-caps Impact-style type with a
// thick black outline. React Native has no text stroke, so the outline is
// eight black copies nudged around the white text.
// ---------------------------------------------------------------------------
const MEME_OUTLINE_OFFSETS = [
  [-2, -2], [0, -2], [2, -2],
  [-2, 0], [2, 0],
  [-2, 2], [0, 2], [2, 2],
] as const;

export function MemeCaption({
  text,
  fontFamily,
}: {
  text: string;
  fontFamily?: string;
}) {
  const { styles } = useContext(ThemeContext);
  const fontStyle = fontFamily ? { fontFamily } : styles.memeTextFallback;
  return (
    <View>
      {MEME_OUTLINE_OFFSETS.map(([x, y]) => (
        <Text
          key={`${x},${y}`}
          style={[
            styles.memeText,
            fontStyle,
            styles.memeTextOutline,
            { transform: [{ translateX: x }, { translateY: y }] },
          ]}>
          {text}
        </Text>
      ))}
      <Text style={[styles.memeText, fontStyle]}>{text}</Text>
    </View>
  );
}
