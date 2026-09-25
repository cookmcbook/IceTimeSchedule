import { createContext } from 'react';

import { DARK_UI, type ThemeColors } from './colors';
import { createStyles, type AppStyles } from './styles';

export const ThemeContext = createContext<{
  colors: ThemeColors;
  styles: AppStyles;
  isDarkMode: boolean;
  toggleTheme: () => void;
}>({
  colors: DARK_UI,
  styles: createStyles(DARK_UI),
  isDarkMode: true,
  toggleTheme: () => undefined,
});
