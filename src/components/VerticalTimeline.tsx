import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Animated, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  VT_CARD_GAP,
  VT_CARD_HEIGHT,
  VT_LINE_X,
  VT_MIN_COLUMN_WIDTH,
  VT_ROW_PADDING,
  VT_TIME_COLUMN_WIDTH,
} from '../constants';
import { ThemeContext } from '../theme/ThemeContext';
import type { Session } from '../types';
import { activityColor, withAlpha } from '../utils/colors';
import { clockParts, minutesFromMidnight } from '../utils/dates';

// ---------------------------------------------------------------------------
// VERTICAL TIMELINE
// Time runs down, locations run across. The header row names each location;
// every row below is one start time, with that row's sessions placed under
// their location's column. The time column (with the timeline line and dots)
// stays pinned on the left while the grid scrolls sideways across locations.
//
// Today starts at the current time: a "Now" row holds sessions in progress,
// followed by upcoming start times; finished sessions are left out. Other
// days start from the beginning of the day.
// ---------------------------------------------------------------------------

const NOW_COLOR = '#FF4D4F';

type VerticalRow = {
  key: string;
  isNow: boolean;
  minutes: number;
  cells: Map<string, Session[]>;
  height: number;
  dotColor: string;
};

function rowHeight(maxStack: number): number {
  return (
    VT_ROW_PADDING * 2 +
    maxStack * VT_CARD_HEIGHT +
    Math.max(0, maxStack - 1) * VT_CARD_GAP
  );
}

function buildRow(
  key: string,
  isNow: boolean,
  minutes: number,
  rowSessions: Session[],
  mixedColor: string
): VerticalRow {
  const cells = new Map<string, Session[]>();
  for (const session of rowSessions) {
    const cell = cells.get(session.Location);
    if (cell) cell.push(session);
    else cells.set(session.Location, [session]);
  }

  const maxStack = Math.max(1, ...[...cells.values()].map((cell) => cell.length));
  const colors = new Set(rowSessions.map((session) => activityColor(session.Activity)));

  return {
    key,
    isNow,
    minutes,
    cells,
    height: rowHeight(maxStack),
    dotColor: isNow ? NOW_COLOR : colors.size === 1 ? [...colors][0] : mixedColor,
  };
}

const VerticalSessionCard = React.memo(function VerticalSessionCard({
  session,
  onPress,
}: {
  session: Session;
  onPress: (session: Session) => void;
}) {
  const { styles } = useContext(ThemeContext);
  const handlePress = useCallback(() => onPress(session), [onPress, session]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${session.Activity} at ${session.Location}, ${session.Rink}, ${session.Time}`}
      style={[
        styles.vtCard,
        { borderLeftColor: activityColor(session.Activity) },
      ]}>
      <Text style={styles.vtCardTitle} numberOfLines={1}>
        {session.Activity}
      </Text>
      <Text style={styles.vtCardRink} numberOfLines={1}>
        {session.Rink}
      </Text>
      <Text style={styles.vtCardTime} numberOfLines={1}>
        {session.Time}
      </Text>
    </Pressable>
  );
});

export function VerticalTimeline({
  sessions,
  nowDateTime,
  viewportWidth,
  onSelectSession,
}: {
  // The selected day's filtered sessions, in start-time order.
  sessions: Session[];
  // Local 'YYYY-MM-DDTHH:MM:00' when the selected day is today, else null.
  nowDateTime: string | null;
  viewportWidth: number;
  onSelectSession: (session: Session) => void;
}) {
  const { styles, colors: UI } = useContext(ThemeContext);
  const scrollX = useRef(new Animated.Value(0)).current;

  const rows = useMemo(() => {
    const result: VerticalRow[] = [];

    if (nowDateTime) {
      const inProgress = sessions.filter(
        (session) =>
          session.StartDateTime <= nowDateTime &&
          session.EndDateTime > nowDateTime
      );
      if (inProgress.length > 0) {
        result.push(
          buildRow('now', true, minutesFromMidnight(nowDateTime), inProgress, UI.textMuted)
        );
      }
    }

    const upcoming = nowDateTime
      ? sessions.filter((session) => session.StartDateTime > nowDateTime)
      : sessions;
    const byStart = new Map<string, Session[]>();
    for (const session of upcoming) {
      const group = byStart.get(session.StartDateTime);
      if (group) group.push(session);
      else byStart.set(session.StartDateTime, [session]);
    }
    for (const [start, rowSessions] of byStart) {
      result.push(
        buildRow(start, false, minutesFromMidnight(start), rowSessions, UI.textMuted)
      );
    }

    return result;
  }, [sessions, nowDateTime, UI.textMuted]);

  const columns = useMemo(() => {
    const names = new Set<string>();
    for (const row of rows) for (const name of row.cells.keys()) names.add(name);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const gridViewportWidth = Math.max(0, viewportWidth - VT_TIME_COLUMN_WIDTH);
  // When every column fits, they stretch to fill the width. When they don't
  // (phones), columns are sized so the last visible one is cut off halfway,
  // a visual cue that the grid scrolls sideways to more rinks.
  const fitsAll = columns.length * VT_MIN_COLUMN_WIDTH <= gridViewportWidth;
  const columnWidth = fitsAll
    ? gridViewportWidth / Math.max(1, columns.length)
    : gridViewportWidth /
      (Math.max(1, Math.floor(gridViewportWidth / VT_MIN_COLUMN_WIDTH)) + 0.5);
  const gridWidth = columnWidth * columns.length;
  const maxScrollX = Math.max(0, gridWidth - gridViewportWidth);

  const gridRef = useRef<ScrollView>(null);

  // Header synchronization stays on the animation graph, with no JS listener
  // or React state updates while the grid is scrolling.
  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: Platform.OS !== 'web',
      }),
    [scrollX]
  );
  const headerTranslate = useMemo(() => Animated.multiply(scrollX, -1), [scrollX]);
  const initialHiddenRight = Math.max(
    0,
    columns.length - Math.floor((gridViewportWidth + 1) / columnWidth)
  );
  const hiddenRightLabels = useMemo(
    () => Array.from({ length: initialHiddenRight }, (_, index) => {
      const count = initialHiddenRight - index;
      const lower = (columns.length - count) * columnWidth - gridViewportWidth - 1;
      const upper = lower + columnWidth;
      const epsilon = Math.min(0.5, columnWidth / 100);
      return {
        count,
        opacity: scrollX.interpolate({
          inputRange: [lower - epsilon, lower, upper - epsilon, upper],
          outputRange: [0, 1, 1, 0],
          extrapolate: 'clamp',
        }),
      };
    }),
    [columnWidth, columns.length, gridViewportWidth, initialHiddenRight, scrollX]
  );

  // Advances to the next column boundary.
  const scrollToNextColumn = useCallback(() => {
    scrollX.stopAnimation((offset) => {
      const next = (Math.floor((offset + 1) / columnWidth) + 1) * columnWidth;
      gridRef.current?.scrollTo({ x: Math.min(maxScrollX, next), animated: true });
    });
  }, [columnWidth, maxScrollX, scrollX]);

  if (rows.length === 0) {
    return (
      <View style={styles.vtEmpty}>
        <Text style={styles.vtEmptyTitle}>That's it for today</Text>
        <Text style={styles.vtEmptyText}>
          Every matching session has already ended. Try tomorrow.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.vtHeaderRow}>
        <View style={[styles.labelHeader, styles.vtCorner]}>
          <Text style={styles.labelHeaderText}>TIME</Text>
        </View>
        <View style={[styles.vtHeaderViewport, { width: gridViewportWidth }]}>
          <Animated.View
            style={[
              styles.vtHeaderTrack,
              { width: gridWidth, transform: [{ translateX: headerTranslate }] },
            ]}>
            {columns.map((location) => (
              <View key={location} style={[styles.vtHeaderCell, { width: columnWidth }]}>
                <Text style={styles.vtHeaderText} numberOfLines={1}>
                  {location}
                </Text>
              </View>
            ))}
          </Animated.View>
        </View>

        {initialHiddenRight > 0 ? (
          <View style={styles.vtMoreHint}>
            <LinearGradient
              pointerEvents="none"
              colors={[withAlpha(UI.surfaceAlt, 0), UI.surfaceAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.vtMoreFade}
            />
            <View style={styles.vtMorePillBacking}>
              <Pressable
                onPress={scrollToNextColumn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Scroll to see more rinks"
                style={styles.vtMorePill}>
                <View>
                  <Text style={[styles.vtMorePillText, { opacity: 0 }]}>
                    {initialHiddenRight} more
                  </Text>
                  {hiddenRightLabels.map(({ count, opacity }) => (
                    <Animated.Text
                      key={count}
                      style={[styles.vtMorePillText, { position: 'absolute', opacity }]}>
                      {count} more
                    </Animated.Text>
                  ))}
                </View>
                <Ionicons name="chevron-forward" size={13} color={UI.accentText} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <ScrollView style={styles.verticalTimeline} nestedScrollEnabled>
        <View style={styles.vtBody}>
          <View style={styles.vtTimeColumn}>
            <View style={[styles.vtLine, { left: VT_LINE_X - 1 }]} />
            {rows.map((row) => {
              const clock = clockParts(row.minutes);
              return (
                <View key={row.key} style={[styles.vtTimeCell, { height: row.height }]}>
                  <View style={styles.vtTimeLabel}>
                    <Text style={[styles.vtTimeText, row.isNow && { color: NOW_COLOR }]}>
                      {row.isNow ? 'Now' : clock.time}
                    </Text>
                    <Text style={styles.vtTimePeriod}>
                      {row.isNow ? `${clock.time} ${clock.period}` : clock.period}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.vtDot,
                      { left: VT_LINE_X - 6, backgroundColor: row.dotColor },
                    ]}
                  />
                </View>
              );
            })}
          </View>

          <Animated.ScrollView
            ref={gridRef}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator
            style={{ width: gridViewportWidth }}
            contentContainerStyle={{ width: gridWidth }}
            onScroll={handleScroll}
            scrollEventThrottle={16}>
            <View style={{ width: gridWidth }}>
              {rows.map((row) => (
                <View
                  key={row.key}
                  style={[
                    styles.vtRow,
                    row.isNow && styles.vtRowNow,
                    { height: row.height },
                  ]}>
                  {columns.map((location) => (
                    <View key={location} style={[styles.vtCell, { width: columnWidth }]}>
                      {(row.cells.get(location) ?? []).map((session) => (
                        <VerticalSessionCard
                          key={`${session.EventId}-${session.Rink}-${session.StartDateTime}`}
                          session={session}
                          onPress={onSelectSession}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </Animated.ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
