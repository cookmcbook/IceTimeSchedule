import React, { useCallback, useContext } from 'react';
import { Pressable, Text } from 'react-native';

import { ThemeContext } from '../theme/ThemeContext';

// ---------------------------------------------------------------------------
// SHARED CONTROLS (kept uniform across the whole app)
// ---------------------------------------------------------------------------
export const Chip = React.memo(function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  // Receives the chip's label, so parents can pass one stable callback to
  // every chip instead of a fresh arrow per chip (which defeats React.memo).
  onPress: (label: string) => void;
}) {
  const { styles } = useContext(ThemeContext);
  const handlePress = useCallback(() => onPress(label), [onPress, label]);
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      hitSlop={4}
      style={[styles.chip, active && styles.chipActive]}>
      <Text
        style={[styles.chipText, active && styles.chipTextActive]}
        numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
});

export function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { styles } = useContext(ThemeContext);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.primaryButton}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { styles } = useContext(ThemeContext);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.secondaryButton}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}
