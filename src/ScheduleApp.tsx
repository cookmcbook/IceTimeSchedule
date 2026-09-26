import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Image,
  Pressable,
  Share,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
// Deep import: the package root pulls in every icon family's font (~4.5 MB of
// .ttf in the web build) even though only Ionicons is used.
import Ionicons from '@expo/vector-icons/Ionicons';
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
import { HeaderBackdrop } from './components/HeaderBackdrop';
import { MemeCaption } from './components/MemeCaption';
import { SessionDetailModal } from './components/SessionDetailModal';
import { HorizontalTimeline } from './components/HorizontalTimeline';
import { VerticalTimeline } from './components/VerticalTimeline';
import {
  ACTIVITY_GROUPS,
  FILTER_STORAGE_KEY,
  HEADER_MAX_HEIGHT,
  HEADER_MIN_HEIGHT,
  OTHER_ACTIVITY_GROUP,
  pageSidePadding,
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
import { formatDate, localDateKey } from './utils/dates';
import { openDirectionsForAddress } from './utils/links';

// Cropped and compressed from the Unsplash original (~1000px wide, about
// 100 KB) so it doesn't bloat the web bundle.
const EMPTY_STATE_IMAGE = require('../assets/images/empty-rink.jpg');

// Space between the top of the header's content area (below the status bar
// / Dynamic Island) and the title. Matches styles.heading's own paddingTop,
// which it replaces so the safe-area inset can be added to it.
const HEADER_CONTENT_TOP_PADDING = 14;

// Shows the About (info) button in the header, which opens the About modal.
const SHOW_ABOUT_BUTTON = true;

export default function ScheduleApp() {
  const {
    colors: UI,
    styles,
    isDarkMode,
    toggleTheme,
  } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const sidePadding = pageSidePadding(windowWidth);
  const isPadded = sidePadding > 0;
  // The timelines size their columns from this: the window minus the page
  // padding and, when framed, the frame's 1px side borders.
  const timelineViewportWidth = Math.max(
    0,
    windowWidth - sidePadding * 2 - (isPadded ? 2 : 0)
  );
  // Not awaited: the meme caption renders in a bold system font until Anton
  // is ready, so a slow font load never blocks the schedule.
  const [memeFontLoaded] = useFonts({ Anton_400Regular });
  const [now, setNow] = useState(() => new Date());

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

    const groups: { name: string; activities: string[] }[] = ACTIVITY_GROUPS.map(
      (group) => ({
        name: group.name,
        activities: group.activities.filter((activity) =>
          activities.includes(activity)
        ),
      })
    );
    // Anything the scraper returns that isn't in ACTIVITY_GROUPS yet.
    if (otherActivities.length > 0) {
      groups.push({ name: OTHER_ACTIVITY_GROUP, activities: otherActivities });
    }
    return groups.filter((group) => group.activities.length > 0);
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

  // Full-width banner. Height follows the photos' 3:1 shape, clamped so it
  // always fits the title on phones and never eats the schedule on desktop.
  const headerContentHeight = Math.round(
    Math.min(HEADER_MAX_HEIGHT, Math.max(HEADER_MIN_HEIGHT, windowWidth / 3))
  );
  // The header also extends up behind the status bar / Dynamic Island (the
  // page doesn't pad its top edge), so the photo fills that strip too while
  // the title and buttons are pushed down below it.
  const headerHeight = headerContentHeight + insets.top;

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

  const isToday = selectedDate === today;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  // Same 'YYYY-MM-DDTHH:MM:00' shape as Session.StartDateTime, so the
  // vertical timeline can compare them as strings.
  const nowDateTime = isToday
    ? `${today}T${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:00`
    : null;

  const selectedDateIndex = dates.indexOf(selectedDate);
  const previousDate =
    selectedDateIndex > 0 ? dates[selectedDateIndex - 1] : undefined;
  const nextDate =
    selectedDateIndex >= 0 && selectedDateIndex < dates.length - 1
      ? dates[selectedDateIndex + 1]
      : undefined;

  return (
    // Pads the bottom and side edges by the device's safe-area insets (home
    // indicator, landscape cutouts) while its own theme background fills
    // them. The top edge isn't padded here: the header photo extends up under
    // the status bar / Dynamic Island, and the header pads its own content.
    <SafeAreaView
      style={styles.safeArea}
      edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View
          style={[
            styles.heading,
            {
              height: headerHeight,
              paddingTop: HEADER_CONTENT_TOP_PADDING + insets.top,
            },
          ]}>
          <HeaderBackdrop
            isDarkMode={isDarkMode}
            width={windowWidth}
            height={headerHeight}
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

        <View style={[styles.pageBody, { paddingHorizontal: sidePadding }]}>
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
          ) : (
            // On padded (wider) layouts the timeline gets a thin rounded frame.
            <View style={[styles.timelineArea, isPadded && styles.timelineAreaFramed]}>
              {timelineView === 'vertical' ? (
                <VerticalTimeline
                  // Remount per day so each date starts scrolled to the
                  // top-left instead of keeping the previous day's (different)
                  // columns offset.
                  key={selectedDate}
                  sessions={filteredSessions}
                  nowDateTime={nowDateTime}
                  viewportWidth={timelineViewportWidth}
                  onSelectSession={setSelectedSession}
                />
              ) : (
                <HorizontalTimeline
                  // Remount per day: each date starts at the top, centered on
                  // the current time for today and at the start of the day
                  // otherwise.
                  key={selectedDate}
                  sessions={filteredSessions}
                  isToday={isToday}
                  currentMinutes={currentMinutes}
                  viewportWidth={timelineViewportWidth}
                  onSelectSession={setSelectedSession}
                />
              )}
            </View>
          )}
        </View>
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
        activityGroups={activityGroups}
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
