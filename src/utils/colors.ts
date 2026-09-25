import { ACTIVITY_COLORS, CATEGORY_COLORS } from '../constants';

// '#RRGGBB' + alpha -> '#RRGGBBAA'. Fading to the same color at alpha 0
// (instead of 'transparent', which is black) avoids a gray band mid-fade.
export function withAlpha(hex: string, alpha: number): string {
  const byte = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${byte}`;
}

export function activityColor(activity: string): string {
  return ACTIVITY_COLORS.get(activity) ?? CATEGORY_COLORS.Other;
}
