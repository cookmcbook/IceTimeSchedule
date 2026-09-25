import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
// Deep import: the package root pulls in every icon family's font (~4.5 MB of
// .ttf in the web build) even though only Ionicons is used.
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';

import scheduleData from '../schedule-data.json';

import { AboutModal } from './components/AboutModal';
import { SecondaryButton } from './components/Controls';
import { DatePickerModal } from './components/DatePickerModal';
import { FilterModal } from './components/FilterModal';
import { MemeCaption } from './components/MemeCaption';
import { SessionDetailModal } from './components/SessionDetailModal';
import {
  LaneLabelRow,
  LaneRow,
  TimelineBackground,
} from './components/Timeline';
import { VerticalTimeline } from './components/VerticalTimeline';
import {
  ACTIVITY_GROUPS,
  FILTER_STORAGE_KEY,
  HEADER_FADE_ALPHAS,
  HEADER_FADE_FRACTION,
  HEADER_HEIGHT,
  HEADER_MAX_HEIGHT,
  HEADER_MIN_HEIGHT,
  HEADER_TITLE_ZONE,
  HOUR_WIDTH,
  LABEL_WIDTH,
  TIMELINE_VIEW_STORAGE_KEY,
} from './constants';
import {
  locationAddressesFromData,
  normalizeSession,
  rawSessionsFromData,
  scheduleUrlsFromData,
  uniqueSorted,
} from './data/schedule';
import { ThemeContext } from './theme/ThemeContext';
import type { RawScheduleData, Session } from './types';
import { withAlpha } from './utils/colors';
import { formatDate, hourLabel, localDateKey } from './utils/dates';
import { buildLane } from './utils/lanes';
import { openDirectionsForAddress } from './utils/links';

// Cropped and compressed from the Unsplash originals in the project root
// (~1000px wide, about 100 KB or less each) so they don't bloat the web
// bundle. Header images are 3:2 so `cover` can fill any header size while
// staying vertically centered on the subject.
const HEADER_HOCKEY_IMAGE = require('../assets/images/header-hockey.jpg');
const HEADER_SKATER_IMAGE = require('../assets/images/header-skater.jpg');
const EMPTY_STATE_IMAGE = require('../assets/images/empty-rink.jpg');

// The About button is hidden from the header for now; the About modal is
// kept so flipping this back to true restores it.
const SHOW_ABOUT_BUTTON = false;

export default function ScheduleApp() {
  const {
    colors: UI,
    styles,
    isDarkMode,
    toggleTheme,
  } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // Not awaited: the meme caption renders in a bold system font until Anton
  // is ready, so a slow font load never blocks the schedule.
  const [memeFontLoaded] = useFonts({ Anton_400Regular });
  const timelineScrollRef = useRef<ScrollView>(null);
  // The grid's horizontal offset, fed straight from its onScroll event. The
  // hour-label header translates by it, so the two stay in sync without a
  // JS round trip per frame on native (useNativeDriver) or a re-render.
  const timelineScrollX = useRef(new Animated.Value(0)).current;
  const [now, setNow] = useState(() => new Date());
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);

  const sessions = useMemo(() => {
    const scheduleUrls = scheduleUrlsFromData(scheduleData as RawScheduleData);
    return (
      rawSessionsFromData(scheduleData as RawScheduleData)
        .map((row) => normalizeSession(row, scheduleUrls))
        .filter(
          (session) =>
            session.Date &&
            session.StartDateTime &&
            session.EndDateTime &&
            session.Location
        )
        .sort(
          (a, b) =>
            a.StartDateTime.localeCompare(b.StartDateTime) ||
            a.Location.localeCompare(b.Location) ||
            a.Rink.localeCompare(b.Rink)
        )
    );
  }, []);

  // date -> that day's sessions (already in start-time order), so filtering
  // only ever scans the selected day instead of the whole schedule.
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const session of sessions) {
      const daySessions = map.get(session.Date);
      if (daySessions) daySessions.push(session);
      else map.set(session.Date, [session]);
    }
    return map;
  }, [sessions]);

  const locationAddresses = useMemo(
    () => locationAddressesFromData(scheduleData as RawScheduleData),
    []
  );

  const today = localDateKey(now);
  const dates = useMemo(
    () => uniqueSorted([...sessionsByDate.keys(), today]),
    [sessionsByDate, today]
  );

  // Depends on `today`, not `now`, so the once-a-minute clock tick doesn't
  // rebuild it (and re-render the memoized DatePickerModal).
  const dateDayMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [date, daySessions] of sessionsByDate) {
      map[date] = daySessions[0].Day;
    }
    if (!map[today]) {
      map[today] = new Date(`${today}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
      });
    }
    return map;
  }, [sessionsByDate, today]);

  const locations = useMemo(
    () => uniqueSorted(sessions.map((session) => session.Location)),
    [sessions]
  );
  const activities = useMemo(
    () => uniqueSorted(sessions.map((session) => session.Activity)),
    [sessions]
  );
  const activityGroups = useMemo(() => {
    const knownActivities = new Set<string>(
      ACTIVITY_GROUPS.flatMap((group) => [...group.activities])
    );
    const otherActivities = activities.filter(
      (activity) => !knownActivities.has(activity)
    );

    return ACTIVITY_GROUPS.map((group) => ({
      name: group.name,
      activities: [
        ...group.activities.filter((activity) => activities.includes(activity)),
        ...(group.name === 'Other' ? otherActivities : []),
      ],
    })).filter((group) => group.activities.length > 0);
  }, [activities]);

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(
    () => new Set()
  );
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    () => new Set()
  );
  const [query, setQuery] = useState('');
  const [filterPreferencesLoaded, setFilterPreferencesLoaded] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const closeAbout = useCallback(() => setAboutVisible(false), []);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  // 'horizontal': hours across, locations down. 'vertical': time rows down,
  // locations across. New users start on vertical; a saved choice wins.
  const [timelineView, setTimelineView] = useState<'horizontal' | 'vertical'>(
    'vertical'
  );
  const [timelineViewLoaded, setTimelineViewLoaded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const savedView = await AsyncStorage.getItem(TIMELINE_VIEW_STORAGE_KEY);
        if (cancelled) return;
        if (savedView === 'horizontal' || savedView === 'vertical') {
          setTimelineView(savedView);
        }
      } catch {
        // No saved preference available; keep the default view.
      } finally {
        if (!cancelled) setTimelineViewLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!timelineViewLoaded) return;
    AsyncStorage.setItem(TIMELINE_VIEW_STORAGE_KEY, timelineView).catch(
      () => undefined
    );
  }, [timelineView, timelineViewLoaded]);

  const toggleTimelineView = useCallback(
    () =>
      setTimelineView((current) =>
        current === 'horizontal' ? 'vertical' : 'horizontal'
      ),
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const savedFilters = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
        if (cancelled || !savedFilters) return;

        const parsed = JSON.parse(savedFilters) as {
          locations?: unknown;
          activities?: unknown;
          query?: unknown;
        };

        if (Array.isArray(parsed.locations)) {
          setSelectedLocations(
            new Set(
              parsed.locations.filter(
                (value): value is string =>
                  typeof value === 'string' && locations.includes(value)
              )
            )
          );
        }

        if (Array.isArray(parsed.activities)) {
          setSelectedActivities(
            new Set(
              parsed.activities.filter(
                (value): value is string =>
                  typeof value === 'string' && activities.includes(value)
              )
            )
          );
        }

        if (typeof parsed.query === 'string') setQuery(parsed.query);
      } catch {
        // Ignore malformed or outdated saved preferences.
      } finally {
        if (!cancelled) setFilterPreferencesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activities, locations]);

  useEffect(() => {
    if (!filterPreferencesLoaded) return;

    AsyncStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({
        locations: [...selectedLocations],
        activities: [...selectedActivities],
        query,
      })
    ).catch(() => undefined);
  }, [
    selectedLocations,
    selectedActivities,
    query,
    filterPreferencesLoaded,
  ]);

  // Stable callbacks so the memoized modals/rows below don't re-render just
  // because ScheduleApp re-rendered (e.g. on the once-a-minute `now` tick).
  const toggleLocation = useCallback((value: string) => {
    setSelectedLocations((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const toggleActivity = useCallback((value: string) => {
    setSelectedActivities((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const clearLocations = useCallback(() => setSelectedLocations(new Set()), []);
  const clearActivities = useCallback(() => setSelectedActivities(new Set()), []);

  const activeFilterCount = selectedLocations.size + selectedActivities.size;

  // Figure skater on the dark arena for dark mode, hockey player on bright ice
  // for light mode.
  const headerImage = isDarkMode ? HEADER_SKATER_IMAGE : HEADER_HOCKEY_IMAGE;

  // Full-width banner. Height follows the photos' 3:1 shape, clamped so it
  // always fits the title on phones and never eats the schedule on desktop.
  // The photo is always exactly header-height tall and pinned right, so its
  // subject is never cropped: on phones only its empty left edge overflows,
  // and on wide screens the theme background fills the space to its left.
  const headerHeight = Math.round(
    Math.min(HEADER_MAX_HEIGHT, Math.max(HEADER_MIN_HEIGHT, windowWidth / 3))
  );
  const headerImageWidth = headerHeight * 3;
  // One smooth gradient: solid theme background up to where the photo starts,
  // then an eased fade to clear across the photo's (pre-blurred) empty left
  // side. Always reaches past the title so it stays readable.
  const headerFade = useMemo(() => {
    const fadeStart = Math.max(0, windowWidth - headerImageWidth);
    const fadeEnd = Math.max(
      HEADER_TITLE_ZONE,
      fadeStart + headerImageWidth * HEADER_FADE_FRACTION
    );
    const solidUntil = fadeStart / fadeEnd;
    // HEADER_FADE_ALPHAS has 7 entries, satisfying LinearGradient's
    // "at least two stops" tuple types.
    return {
      width: fadeEnd,
      colors: HEADER_FADE_ALPHAS.map((alpha) =>
        withAlpha(UI.bg, alpha)
      ) as unknown as readonly [string, string, ...string[]],
      locations: HEADER_FADE_ALPHAS.map(
        (_, index) =>
          solidUntil +
          (1 - solidUntil) * (index / (HEADER_FADE_ALPHAS.length - 1))
      ) as unknown as readonly [number, number, ...number[]],
    };
  }, [windowWidth, headerImageWidth, UI.bg]);

  const resetFilters = useCallback(() => {
    setSelectedLocations(new Set());
    setSelectedActivities(new Set());
  }, []);

  const openDirections = useCallback(
    (session: Session) => {
      const address = locationAddresses[session.Location];
      if (!address) return;
      void openDirectionsForAddress(address);
    },
    [locationAddresses]
  );

  const shareSession = useCallback(
    (session: Session) => {
      const address = locationAddresses[session.Location];
      const message = [
        `${session.Activity} at ${session.Location}`,
        `${session.Day ? `${session.Day}, ` : ''}${session.Date} · ${session.Time}`,
        session.Rink,
        address,
      ]
        .filter(Boolean)
        .join('\n');

      void Share.share({
        title: `${session.Activity} reminder`,
        message,
      }).catch(() => undefined);
    },
    [locationAddresses]
  );

  const closeFilters = useCallback(() => setFiltersVisible(false), []);
  const closeDatePicker = useCallback(() => setDatePickerVisible(false), []);
  const closeSessionDetail = useCallback(() => setSelectedSession(null), []);
  const selectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setDatePickerVisible(false);
  }, []);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (sessionsByDate.get(selectedDate) ?? []).filter((session) => {
      if (
        selectedLocations.size > 0 &&
        !selectedLocations.has(session.Location)
      )
        return false;
      if (
        selectedActivities.size > 0 &&
        !selectedActivities.has(session.Activity)
      )
        return false;
      if (!normalizedQuery) return true;

      return [
        session.Location,
        session.Rink,
        session.Activity,
        session.Description,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [sessionsByDate, selectedDate, selectedLocations, selectedActivities, query]);

  const lanes = useMemo(() => {
    const groups = new Map<string, Session[]>();
    for (const session of filteredSessions) {
      const existing = groups.get(session.Location);
      if (existing) existing.push(session);
      else groups.set(session.Location, [session]);
    }

    return [...groups.entries()]
      .map(([key, laneSessions]) => buildLane(key, laneSessions))
      .sort((a, b) => a.location.localeCompare(b.location));
  }, [filteredSessions]);

  const isToday = selectedDate === today;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  // Same 'YYYY-MM-DDTHH:MM:00' shape as Session.StartDateTime, so the
  // vertical timeline can compare them as strings.
  const nowDateTime = isToday
    ? `${today}T${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:00`
    : null;

  const firstHour = 5;
  const lastHour = 24;

  const selectedDateIndex = dates.indexOf(selectedDate);
  const previousDate =
    selectedDateIndex > 0 ? dates[selectedDateIndex - 1] : undefined;
  const nextDate =
    selectedDateIndex >= 0 && selectedDateIndex < dates.length - 1
      ? dates[selectedDateIndex + 1]
      : undefined;
  const timelineWidth = (lastHour - firstHour) * HOUR_WIDTH;
  const visibleTimelineWidth = Math.max(0, windowWidth - LABEL_WIDTH);
  const timelineHeight = lanes.reduce((total, lane) => total + lane.height, 0);
  const currentTimeLeft = ((currentMinutes - firstHour * 60) / 60) * HOUR_WIDTH;

  useEffect(() => {
    if (timelineViewportWidth <= 0) return;

    const frame = requestAnimationFrame(() => {
      if (!isToday) {
        timelineScrollRef.current?.scrollTo({ x: 0, animated: false });
        return;
      }

      const maximumScroll = Math.max(0, timelineWidth - timelineViewportWidth);
      const centeredPosition = currentTimeLeft - timelineViewportWidth / 2;
      const x = Math.max(0, Math.min(maximumScroll, centeredPosition));
      timelineScrollRef.current?.scrollTo({ x, animated: false });
    });

    return () => cancelAnimationFrame(frame);
    // Re-center when the selected date, viewport, or view changes (switching
    // back to horizontal remounts the grid at x=0). The minute timer moves the
    // red line without repeatedly taking scrolling away from users.
  }, [
    selectedDate,
    isToday,
    timelineViewportWidth,
    firstHour,
    timelineWidth,
    timelineView,
  ]);

  // Keeps the hour-label header locked to the grid's horizontal offset. The
  // grid's scroll events (user or programmatic scrollTo) are the only input,
  // so header and grid can never end up desynced. The native driver isn't
  // available on web, where Animated updates the style directly instead.
  const handleTimelineScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { x: timelineScrollX } } }],
        { useNativeDriver: Platform.OS !== 'web' }
      ),
    [timelineScrollX]
  );
  const timelineHeaderTranslate = useMemo(
    () => Animated.multiply(timelineScrollX, -1),
    [timelineScrollX]
  );

  // "N more ⌄" hint for the horizontal view: counts rink lanes that are
  // still (partly) below the visible area. Like the vertical view's hint, it
  // only sets state when the count changes, not on every scroll frame.
  const laneScrollRef = useRef<ScrollView>(null);
  const laneScrollY = useRef(0);
  const laneViewportHeight = useRef(0);
  const [hiddenLanes, setHiddenLanes] = useState(0);
  const laneBottoms = useMemo(() => {
    let total = 0;
    return lanes.map((lane) => (total += lane.height));
  }, [lanes]);
  const updateHiddenLanes = useCallback(() => {
    if (laneViewportHeight.current <= 0) return;
    const visibleBottom = laneScrollY.current + laneViewportHeight.current + 1;
    const next = laneBottoms.filter((bottom) => bottom > visibleBottom).length;
    setHiddenLanes((current) => (current === next ? current : next));
  }, [laneBottoms]);
  useEffect(updateHiddenLanes, [updateHiddenLanes]);

  // Scrolls just far enough to bring the next partly hidden lane fully into
  // view.
  const scrollToNextLane = useCallback(() => {
    const visibleBottom = laneScrollY.current + laneViewportHeight.current + 1;
    const nextBottom = laneBottoms.find((bottom) => bottom > visibleBottom);
    if (nextBottom === undefined) return;
    laneScrollRef.current?.scrollTo({
      y: Math.max(0, nextBottom - laneViewportHeight.current),
      animated: true,
    });
  }, [laneBottoms]);

  return (
    // Pads every edge by the device's safe-area insets (notch, Dynamic Island,
    // home indicator, landscape cutouts) while its own theme background fills
    // those areas, so nothing under the status bar shows a mismatched color.
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={[styles.heading, { height: headerHeight }]}>
          <Image
            source={headerImage}
            resizeMode="cover"
            style={[
              styles.headerImage,
              { width: headerImageWidth, height: headerHeight },
            ]}
            accessibilityIgnoresInvertColors
          />
          <LinearGradient
            pointerEvents="none"
            colors={headerFade.colors}
            locations={headerFade.locations}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.headerFade, { width: headerFade.width }]}
          />
          <Text style={styles.eyebrow}>DALLAS STARS ICE FINDER</Text>
          <Text style={styles.title}>STARCENTER TIMES</Text>
          <Text style={styles.disclaimer}>
            Unofficial—not affiliated with the Dallas Stars
          </Text>

          <View style={styles.headingActions}>
            {SHOW_ABOUT_BUTTON ? (
              <Pressable
                style={styles.themeButton}
                onPress={() => setAboutVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="About this app">
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={UI.textPrimary}
                />
              </Pressable>
            ) : null}
            <Pressable
              style={styles.themeButton}
              onPress={toggleTimelineView}
              accessibilityRole="button"
              accessibilityLabel={
                timelineView === 'horizontal'
                  ? 'Switch to vertical timeline'
                  : 'Switch to horizontal timeline'
              }>
              <Ionicons
                name={
                  timelineView === 'horizontal'
                    ? 'swap-vertical-outline'
                    : 'swap-horizontal-outline'
                }
                size={19}
                color={UI.textPrimary}
              />
            </Pressable>
            <Pressable
              style={styles.themeButton}
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={
                isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'
              }>
              <Ionicons
                name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={UI.textPrimary}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search rink, location, or activity"
            placeholderTextColor={UI.textMuted}
            style={styles.search}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search rink, location, or activity"
          />

          <Pressable
            style={styles.filterButton}
            onPress={() => setFiltersVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open filters">
            <Ionicons
              name="options-outline"
              size={17}
              color={UI.textPrimary}
            />
            <Text style={styles.filterButtonText}>Filters</Text>
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.dateNavigator}>
          <Pressable
            disabled={!previousDate}
            onPress={() => previousDate && setSelectedDate(previousDate)}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            accessibilityState={{ disabled: !previousDate }}
            style={[
              styles.dateNavButton,
              !previousDate && styles.dateNavButtonDisabled,
            ]}>
            <Text style={styles.dateNavArrow}>‹</Text>
            <Text style={styles.dateNavText} numberOfLines={1}>
              {previousDate ? formatDate(previousDate) : 'Start'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.selectedDatePanel}
            onPress={() => setDatePickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`${formatDate(selectedDate)}. Choose a date`}>
            <View style={styles.selectedDateDayRow}>
              <Ionicons
                name="calendar-outline"
                size={11}
                color={UI.accentText}
              />
              <Text style={styles.selectedDateDay} numberOfLines={1}>
                {dateDayMap[selectedDate] || 'Schedule'}
              </Text>
            </View>
            <Text style={styles.selectedDateText}>
              {formatDate(selectedDate)}
            </Text>
            {isToday ? (
              <Text style={styles.selectedDateToday}>Today</Text>
            ) : null}
          </Pressable>

          <Pressable
            disabled={!nextDate}
            onPress={() => nextDate && setSelectedDate(nextDate)}
            accessibilityRole="button"
            accessibilityLabel="Next day"
            accessibilityState={{ disabled: !nextDate }}
            style={[
              styles.dateNavButton,
              !nextDate && styles.dateNavButtonDisabled,
            ]}>
            <Text style={styles.dateNavArrow}>›</Text>
            <Text style={styles.dateNavText} numberOfLines={1}>
              {nextDate ? formatDate(nextDate) : 'End'}
            </Text>
          </Pressable>

          <Pressable
            disabled={isToday}
            onPress={() => setSelectedDate(today)}
            accessibilityRole="button"
            accessibilityLabel="Jump to today"
            accessibilityState={{ disabled: isToday }}
            style={[
              styles.todayButton,
              isToday && styles.dateNavButtonDisabled,
            ]}>
            <Ionicons
              name="today-outline"
              size={19}
              color={UI.victoryGreen}
            />
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
        </View>

        {filteredSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <View
              style={styles.memePanel}
              accessible
              accessibilityLabel={
                activeFilterCount > 0 || query
                  ? 'No matching sessions. Try another date or adjust your filters.'
                  : 'No sessions on this date. Try another date.'
              }>
              <Image
                source={EMPTY_STATE_IMAGE}
                resizeMode="cover"
                style={styles.memeImage}
                accessibilityIgnoresInvertColors
              />
              <MemeCaption
                text="No matching sessions"
                fontFamily={memeFontLoaded ? 'Anton_400Regular' : undefined}
              />
              <MemeCaption
                text="Try another date or adjust your filters"
                fontFamily={memeFontLoaded ? 'Anton_400Regular' : undefined}
              />
            </View>
            {activeFilterCount > 0 || query ? (
              <View style={{ marginTop: 16 }}>
                <SecondaryButton
                  label="Reset filters"
                  onPress={() => {
                    resetFilters();
                    setQuery('');
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : timelineView === 'vertical' ? (
          <VerticalTimeline
            // Remount per day so each date starts scrolled to the top-left
            // instead of keeping the previous day's (different) columns offset.
            key={selectedDate}
            sessions={filteredSessions}
            nowDateTime={nowDateTime}
            viewportWidth={windowWidth}
            onSelectSession={setSelectedSession}
          />
        ) : (
          <View style={styles.timelineContainer}>
            <View style={styles.timelineHeaderRow}>
              <View
                style={[
                  styles.labelHeader,
                  { width: LABEL_WIDTH, height: HEADER_HEIGHT },
                ]}>
                <Text style={styles.labelHeaderText}>LOCATION</Text>
              </View>

              {/* Not user-scrollable: a clipped window whose content is
                  translated by the grid's scroll offset (handleTimelineScroll
                  below), so it always tracks the grid. */}
              <View
                style={[
                  styles.timelineScroller,
                  styles.timeHeaderViewport,
                  { width: visibleTimelineWidth },
                ]}>
                <Animated.View
                  style={[
                    styles.timeHeader,
                    {
                      height: HEADER_HEIGHT,
                      width: timelineWidth,
                      transform: [{ translateX: timelineHeaderTranslate }],
                    },
                  ]}>
                  {Array.from(
                    { length: lastHour - firstHour + 1 },
                    (_, index) => firstHour + index
                  ).map((hour) => (
                    <View
                      key={hour}
                      style={[
                        styles.hourLabel,
                        { left: (hour - firstHour) * HOUR_WIDTH },
                      ]}>
                      <Text style={styles.hourLabelText}>
                        {hourLabel(hour)}
                      </Text>
                    </View>
                  ))}
                </Animated.View>
              </View>
            </View>

            <ScrollView
              ref={laneScrollRef}
              style={styles.verticalTimeline}
              contentContainerStyle={styles.verticalTimelineContent}
              nestedScrollEnabled
              onLayout={(event) => {
                laneViewportHeight.current = event.nativeEvent.layout.height;
                updateHiddenLanes();
              }}
              onScroll={(event) => {
                laneScrollY.current = event.nativeEvent.contentOffset.y;
                updateHiddenLanes();
              }}
              scrollEventThrottle={16}>
              <View style={styles.timelineFrame}>
                <View style={styles.labelColumn}>
                  {lanes.map((lane, index) => (
                    <LaneLabelRow
                      key={lane.key}
                      lane={lane}
                      alt={index % 2 === 1}
                    />
                  ))}
                </View>

                <Animated.ScrollView
                  ref={timelineScrollRef}
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator
                  style={[
                    styles.timelineScroller,
                    { width: visibleTimelineWidth },
                  ]}
                  contentContainerStyle={{ width: timelineWidth }}
                  onLayout={(event) =>
                    setTimelineViewportWidth(event.nativeEvent.layout.width)
                  }
                  onScroll={handleTimelineScroll}
                  scrollEventThrottle={16}>
                  <View style={{ width: timelineWidth }}>
                    <TimelineBackground
                      lanes={lanes}
                      hourCount={lastHour - firstHour + 1}
                    />
                    {lanes.map((lane) => (
                      <LaneRow
                        key={lane.key}
                        lane={lane}
                        firstHour={firstHour}
                        lastHour={lastHour}
                        timelineWidth={timelineWidth}
                        onSelectSession={setSelectedSession}
                      />
                    ))}

                    {/* "Now" indicator: a vertical line spanning every lane
                        (height=timelineHeight covers the full stacked grid),
                        with a colored dot at the top. Green while today's
                        sessions are still ahead/in progress, red once the
                        visible schedule for today has fully elapsed. */}
                    {isToday &&
                      currentTimeLeft >= 0 &&
                      currentTimeLeft <= timelineWidth ? (
                      <View
                        style={[
                          styles.currentTimeLine,
                          {
                            left: currentTimeLeft,
                            height: timelineHeight,
                            backgroundColor:
                              currentTimeLeft >= timelineWidth - HOUR_WIDTH
                                ? UI.textMuted
                                : styles.currentTimeLine.backgroundColor,
                            pointerEvents: 'none',
                          },
                        ]}>
                        <View
                          style={[
                            styles.currentTimeDot,
                            {
                              backgroundColor:
                                currentTimeLeft >= timelineWidth - HOUR_WIDTH
                                  ? UI.textMuted
                                  : styles.currentTimeDot.backgroundColor,
                            },
                          ]}
                        />
                      </View>
                    ) : null}
                  </View>
                </Animated.ScrollView>
              </View>
            </ScrollView>

            {hiddenLanes > 0 ? (
              <View style={styles.laneMoreHint} pointerEvents="box-none">
                <LinearGradient
                  pointerEvents="none"
                  colors={[withAlpha(UI.surface, 0), UI.surface]}
                  style={StyleSheet.absoluteFill}
                />
                <Pressable
                  onPress={scrollToNextLane}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Scroll to see ${hiddenLanes} more ${hiddenLanes === 1 ? 'rink' : 'rinks'}`}
                  style={styles.vtMorePill}>
                  <Text style={styles.vtMorePillText}>{hiddenLanes} more</Text>
                  <Ionicons
                    name="chevron-down"
                    size={13}
                    color={UI.accentText}
                  />
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <DatePickerModal
        visible={datePickerVisible}
        dates={dates}
        dateDayMap={dateDayMap}
        selectedDate={selectedDate}
        today={today}
        insetsBottom={insets.bottom}
        onSelect={selectDate}
        onClose={closeDatePicker}
      />

      <AboutModal
        visible={aboutVisible}
        insetsBottom={insets.bottom}
        onClose={closeAbout}
      />

      <FilterModal
        visible={filtersVisible}
        locations={locations}
        activityGroups={activityGroups as { name: string; activities: string[] }[]}
        selectedLocations={selectedLocations}
        selectedActivities={selectedActivities}
        onToggleLocation={toggleLocation}
        onToggleActivity={toggleActivity}
        onClearLocations={clearLocations}
        onClearActivities={clearActivities}
        onReset={resetFilters}
        onClose={closeFilters}
        insetsBottom={insets.bottom}
      />

      <SessionDetailModal
        session={selectedSession}
        hasAddress={Boolean(
          selectedSession && locationAddresses[selectedSession.Location]
        )}
        onDirections={openDirections}
        onShare={shareSession}
        onClose={closeSessionDetail}
        insetsBottom={insets.bottom}
      />
    </SafeAreaView>
  );
}
