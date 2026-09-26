import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { THEME_STORAGE_KEY, THEME_TRANSITION_MS } from './src/constants';
import ScheduleApp from './src/ScheduleApp';
import { DARK_UI, LIGHT_UI } from './src/theme/colors';
import { createStyles } from './src/theme/styles';
import { ThemeContext } from './src/theme/ThemeContext';

// ---------------------------------------------------------------------------
// APP
// ---------------------------------------------------------------------------
export default function App() {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme !== 'light');
  const [themePreferenceLoaded, setThemePreferenceLoaded] = useState(false);
  const colors = isDarkMode ? DARK_UI : LIGHT_UI;
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (cancelled) return;
        if (savedTheme === 'dark') setIsDarkMode(true);
        if (savedTheme === 'light') setIsDarkMode(false);
      } catch {
        // No saved preference available; fall back to system theme.
      } finally {
        if (!cancelled) setThemePreferenceLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!themePreferenceLoaded) return;
    AsyncStorage.setItem(
      THEME_STORAGE_KEY,
      isDarkMode ? 'dark' : 'light'
    ).catch(() => undefined);
  }, [isDarkMode, themePreferenceLoaded]);

  // Web/PWA: paint the page itself (and the browser/OS status bar tint) in
  // the theme background, so any area outside the React root — overscroll,
  // the iOS status bar under `black-translucent` — matches the app.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = colors.bg;
    document.body.style.backgroundColor = colors.bg;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', colors.bg);
  }, [colors.bg]);

  // Web: fade the page's colors on a theme switch. The .theme-transition
  // class (public/index.html) turns on CSS color transitions only for the
  // switch itself, so they never slow down scrolling or button feedback the
  // rest of the time. The header photo crossfades on its own
  // (HeaderBackdrop), on every platform.
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleTheme = useCallback(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.add('theme-transition');
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => {
        root.classList.remove('theme-transition');
        transitionTimer.current = null;
      }, THEME_TRANSITION_MS + 100);
    }
    setIsDarkMode((current) => !current);
  }, []);
  const themeValue = useMemo(
    () => ({ colors, styles, isDarkMode, toggleTheme }),
    [colors, styles, isDarkMode, toggleTheme]
  );

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={themeValue}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={colors.bg}
        />
        <ScheduleApp />
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
