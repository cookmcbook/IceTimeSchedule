import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import {
  VT_CARD_GAP,
  VT_CARD_HEIGHT,
  VT_LINE_X,
  VT_MIN_COLUMN_WIDTH,
  VT_ROW_PADDING,
  VT_TIME_COLUMN_WIDTH,
} from '../constants';
import { useScrollSyncedHeader } from '../hooks/useScrollSyncedHeader';
import { ThemeContext } from '../theme/ThemeContext';
import type { Session } from '../types';
import { activityColor } from '../utils/colors';
import { clockParts, minutesFromMidnight } from '../utils/dates';
import { MoreHint, type MoreHintHandle } from './MoreHint';

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
const IS_WEB = Platform.OS === 'web';

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

  // ----- "N more ›" hint: rink columns still (partly) off the right edge.
  const hintRef = useRef<MoreHintHandle>(null);
  const webScrollRef = useRef<View>(null);
  const webHeaderRowRef = useRef<View>(null);
  const nativeGridRef = useRef<ScrollView>(null);
  const nativeOffsetX = useRef(0);

  const hiddenRightAt = useCallback(
    (x: number) =>
      Math.max(0, columns.length - Math.floor((x + gridViewportWidth + 1) / columnWidth)),
    [columns.length, gridViewportWidth, columnWidth]
  );

  // Web: an IntersectionObserver on the header cells reports when a column
  // enters or leaves view, so nothing runs per scroll frame and the pill
  // only re-renders when the count changes.
  useEffect(() => {
    if (!IS_WEB || typeof IntersectionObserver === 'undefined') return;
    const root = webScrollRef.current as unknown as HTMLElement | null;
    const headerRow = webHeaderRowRef.current as unknown as HTMLElement | null;
    if (!root || !headerRow) return;

    const hidden = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const bounds = entry.rootBounds;
          const offRight =
            !!bounds &&
            entry.intersectionRatio < 0.99 &&
            entry.boundingClientRect.right > bounds.right + 1;
          if (offRight) hidden.add(entry.target);
          else hidden.delete(entry.target);
        }
        hintRef.current?.setCount(hidden.size);
      },
      { root, threshold: [0, 0.5, 0.99, 1] }
    );
    // The first child is the pinned TIME corner; the rest are rink columns.
    Array.from(headerRow.children)
      .slice(1)
      .forEach((cell) => observer.observe(cell));
    return () => observer.disconnect();
  }, [columns, columnWidth]);

  // Native: counted from the scroll listener; setCount is a no-op unless
  // the number changes.
  const handleNativeOffset = useCallback(
    (x: number) => {
      nativeOffsetX.current = x;
      hintRef.current?.setCount(hiddenRightAt(x));
    },
    [hiddenRightAt]
  );
  useEffect(() => {
    if (!IS_WEB) hintRef.current?.setCount(hiddenRightAt(nativeOffsetX.current));
  }, [hiddenRightAt]);

  // Scrolls to the next column boundary.
  const scrollToNextColumn = useCallback(() => {
    const nextBoundary = (x: number) =>
      (Math.floor((x + 1) / columnWidth) + 1) * columnWidth;
    if (IS_WEB) {
      const root = webScrollRef.current as unknown as HTMLElement | null;
      if (!root) return;
      root.scrollTo({
        left: Math.min(root.scrollWidth - root.clientWidth, nextBoundary(root.scrollLeft)),
        behavior: 'smooth',
      });
    } else {
      nativeGridRef.current?.scrollTo({
        x: Math.min(Math.max(0, gridWidth - gridViewportWidth), nextBoundary(nativeOffsetX.current)),
        animated: true,
      });
    }
  }, [columnWidth, gridWidth, gridViewportWidth]);

  // Native only (see the web branch below for why web doesn't use it).
  const {
    onScroll: handleNativeScroll,
    trackRef: nativeHeaderTrackRef,
    trackStyle: nativeHeaderTrackStyle,
  } = useScrollSyncedHeader(IS_WEB ? undefined : handleNativeOffset);

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

  const cornerCell = (
    <Text style={styles.labelHeaderText}>TIME</Text>
  );

  const headerCells = columns.map((location) => (
    <View key={location} style={[styles.vtHeaderCell, { width: columnWidth }]}>
      <Text style={styles.vtHeaderText} numberOfLines={1}>
        {location}
      </Text>
    </View>
  ));

  const timeCells = (
    <>
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
    </>
  );

  const grid = (
    <View style={[styles.gridStack, { width: gridWidth }]}>
      {rows.map((row) => (
        <View
          key={row.key}
          style={[styles.vtRow, row.isNow && styles.vtRowNow, { height: row.height }]}>
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
  );

  // Web: one area scrolling both ways, with the location header pinned by
  // `position: sticky` to the top and the time column to the left. The
  // browser keeps them in place on the compositor, so scrolling runs no
  // JavaScript and repaints nothing. (Moving the header from a scroll handler
  // instead repainted the whole screen on every scroll event, which
  // stuttered on phones.)
  if (IS_WEB) {
    const contentWidth = VT_TIME_COLUMN_WIDTH + gridWidth;
    return (
      <View style={styles.timelineContainer}>
        <View ref={webScrollRef} style={styles.webScrollBoth}>
          <View style={{ width: contentWidth }}>
            <View
              ref={webHeaderRowRef}
              style={[
                styles.vtHeaderRow,
                styles.vtHeaderRowDivider,
                styles.webStickyTop,
                { width: contentWidth },
              ]}>
              <View style={[styles.labelHeader, styles.vtCorner, styles.webStickyLeft]}>
                {cornerCell}
              </View>
              {headerCells}
            </View>
            <View style={styles.vtBody}>
              <View style={[styles.vtTimeColumn, styles.webStickyLeft]}>{timeCells}</View>
              {grid}
            </View>
          </View>
        </View>
        <MoreHint ref={hintRef} direction="right" onPress={scrollToNextColumn} />
      </View>
    );
  }

  // Native: a horizontal ScrollView nested in a vertical one, with the
  // location header moved by a native-driver Animated transform.
  return (
    <View style={styles.timelineContainer}>
      <View style={styles.vtHeaderRow}>
        <View style={[styles.labelHeader, styles.vtCorner]}>{cornerCell}</View>
        <View style={[styles.vtHeaderViewport, { width: gridViewportWidth }]}>
          <Animated.View
            ref={nativeHeaderTrackRef}
            style={[styles.vtHeaderTrack, { width: gridWidth }, nativeHeaderTrackStyle]}>
            {headerCells}
          </Animated.View>
        </View>
      </View>

      <ScrollView style={styles.verticalTimeline} nestedScrollEnabled>
        <View style={styles.vtBody}>
          <View style={styles.vtTimeColumn}>{timeCells}</View>
          <Animated.ScrollView
            ref={nativeGridRef}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator
            style={{ width: gridViewportWidth }}
            contentContainerStyle={{ width: gridWidth }}
            onScroll={handleNativeScroll}
            scrollEventThrottle={16}>
            {grid}
          </Animated.ScrollView>
        </View>
      </ScrollView>
      <MoreHint ref={hintRef} direction="right" onPress={scrollToNextColumn} />
    </View>
  );
}

