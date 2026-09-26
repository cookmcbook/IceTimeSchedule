import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, ScrollView, Text, View } from 'react-native';

import { HEADER_HEIGHT, HOUR_WIDTH, LABEL_WIDTH } from '../constants';
import { useScrollSyncedHeader } from '../hooks/useScrollSyncedHeader';
import { ThemeContext } from '../theme/ThemeContext';
import type { Session } from '../types';
import { hourLabel } from '../utils/dates';
import { buildLane } from '../utils/lanes';
import { MoreHint, type MoreHintHandle } from './MoreHint';
import { LaneLabelRow, LaneRow, TimelineBackground } from './Timeline';

const FIRST_HOUR = 5;
const LAST_HOUR = 24;
const IS_WEB = Platform.OS === 'web';

// ---------------------------------------------------------------------------
// HORIZONTAL TIMELINE
// Hours run across, locations run down. The hour header stays pinned to the
// top and the location column to the left while the grid scrolls both ways.
//
// Web: one scroll area that scrolls both directions, with the header row and
// location column pinned by CSS `position: sticky`. The browser keeps them
// aligned on the compositor, so scrolling runs no JavaScript and triggers no
// repaints. (Moving a header from a scroll handler instead repainted the
// whole screen on every scroll event, which stuttered on phones.)
//
// Native: a horizontal ScrollView nested in a vertical one, with the hour
// header moved by a native-driver Animated transform (off the JS thread).
// ---------------------------------------------------------------------------
export function HorizontalTimeline({
  sessions,
  isToday,
  currentMinutes,
  viewportWidth,
  onSelectSession,
}: {
  // The selected day's filtered sessions.
  sessions: Session[];
  isToday: boolean;
  // Minutes since midnight right now, for the red "now" line.
  currentMinutes: number;
  viewportWidth: number;
  onSelectSession: (session: Session) => void;
}) {
  const { styles, colors: UI } = useContext(ThemeContext);

  const lanes = useMemo(() => {
    const groups = new Map<string, Session[]>();
    for (const session of sessions) {
      const existing = groups.get(session.Location);
      if (existing) existing.push(session);
      else groups.set(session.Location, [session]);
    }
    return [...groups.entries()]
      .map(([key, laneSessions]) => buildLane(key, laneSessions))
      .sort((a, b) => a.location.localeCompare(b.location));
  }, [sessions]);

  const timelineWidth = (LAST_HOUR - FIRST_HOUR) * HOUR_WIDTH;
  const visibleTimelineWidth = Math.max(0, viewportWidth - LABEL_WIDTH);
  const timelineHeight = lanes.reduce((total, lane) => total + lane.height, 0);
  const currentTimeLeft = ((currentMinutes - FIRST_HOUR * 60) / 60) * HOUR_WIDTH;

  // Width of the scrolling hour area actually on screen (measured), used to
  // center today's timeline on the current time.
  const [gridViewportWidth, setGridViewportWidth] = useState(0);
  const webScrollRef = useRef<View>(null);
  const nativeScrollRef = useRef<ScrollView>(null);

  // Read through a ref so the once-a-minute tick moves the red line without
  // re-centering (and taking scrolling away from) someone mid-scroll.
  const currentTimeLeftRef = useRef(currentTimeLeft);
  currentTimeLeftRef.current = currentTimeLeft;

  // Center on the current time when the day (remount) or viewport changes.
  useEffect(() => {
    if (gridViewportWidth <= 0) return;
    const frame = requestAnimationFrame(() => {
      const maximumScroll = Math.max(0, timelineWidth - gridViewportWidth);
      const x = isToday
        ? Math.max(
            0,
            Math.min(maximumScroll, currentTimeLeftRef.current - gridViewportWidth / 2)
          )
        : 0;
      if (IS_WEB) {
        // react-native-web View refs are the underlying DOM elements.
        const node = webScrollRef.current as unknown as HTMLElement | null;
        if (node) node.scrollLeft = x;
      } else {
        nativeScrollRef.current?.scrollTo({ x, animated: false });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isToday, gridViewportWidth, timelineWidth]);

  const {
    onScroll: handleNativeScroll,
    trackRef: nativeHeaderTrackRef,
    trackStyle: nativeHeaderTrackStyle,
  } = useScrollSyncedHeader();

  // ----- "N more ⌄" hint: rink lanes still (partly) below the visible area.
  const hintRef = useRef<MoreHintHandle>(null);
  const webLabelColumnRef = useRef<View>(null);
  const nativeVerticalRef = useRef<ScrollView>(null);
  const nativeScrollY = useRef(0);
  const nativeViewportHeight = useRef(0);
  const laneBottoms = useMemo(() => {
    let total = 0;
    return lanes.map((lane) => (total += lane.height));
  }, [lanes]);

  // Web: an IntersectionObserver on the location labels reports when a lane
  // enters or leaves view, so nothing runs per scroll frame and the pill
  // only re-renders when the count changes.
  useEffect(() => {
    if (!IS_WEB || typeof IntersectionObserver === 'undefined') return;
    const root = webScrollRef.current as unknown as HTMLElement | null;
    const labelColumn = webLabelColumnRef.current as unknown as HTMLElement | null;
    if (!root || !labelColumn) return;

    const hidden = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const bounds = entry.rootBounds;
          const below =
            !!bounds &&
            entry.intersectionRatio < 0.99 &&
            entry.boundingClientRect.bottom > bounds.bottom + 1;
          if (below) hidden.add(entry.target);
          else hidden.delete(entry.target);
        }
        hintRef.current?.setCount(hidden.size);
      },
      { root, threshold: [0, 0.5, 0.99, 1] }
    );
    Array.from(labelColumn.children).forEach((label) => observer.observe(label));
    return () => observer.disconnect();
  }, [lanes]);

  // Native: counted from the vertical scroll/layout; setCount is a no-op
  // unless the number changes.
  const updateNativeHidden = useCallback(() => {
    if (nativeViewportHeight.current <= 0) return;
    const visibleBottom = nativeScrollY.current + nativeViewportHeight.current + 1;
    hintRef.current?.setCount(
      laneBottoms.filter((bottom) => bottom > visibleBottom).length
    );
  }, [laneBottoms]);
  useEffect(() => {
    if (!IS_WEB) updateNativeHidden();
  }, [updateNativeHidden]);

  // Scrolls just far enough to bring the next partly hidden lane fully into
  // view.
  const scrollToNextLane = useCallback(() => {
    if (IS_WEB) {
      const root = webScrollRef.current as unknown as HTMLElement | null;
      const labelColumn = webLabelColumnRef.current as unknown as HTMLElement | null;
      if (!root || !labelColumn) return;
      // clientHeight excludes a horizontal scrollbar, if one is showing.
      const visibleBottom = root.getBoundingClientRect().top + root.clientHeight;
      const next = Array.from(labelColumn.children)
        .map((label) => label.getBoundingClientRect())
        .find((rect) => rect.bottom > visibleBottom + 1);
      if (next) root.scrollBy({ top: next.bottom - visibleBottom, behavior: 'smooth' });
    } else {
      const visibleBottom = nativeScrollY.current + nativeViewportHeight.current + 1;
      const nextBottom = laneBottoms.find((bottom) => bottom > visibleBottom);
      if (nextBottom === undefined) return;
      nativeVerticalRef.current?.scrollTo({
        y: Math.max(0, nextBottom - nativeViewportHeight.current),
        animated: true,
      });
    }
  }, [laneBottoms]);

  const hourLabels = Array.from(
    { length: LAST_HOUR - FIRST_HOUR + 1 },
    (_, index) => FIRST_HOUR + index
  ).map((hour) => (
    <View
      key={hour}
      style={[styles.hourLabel, { left: (hour - FIRST_HOUR) * HOUR_WIDTH }]}>
      <Text style={styles.hourLabelText}>{hourLabel(hour)}</Text>
    </View>
  ));

  const laneLabels = lanes.map((lane, index) => (
    <LaneLabelRow key={lane.key} lane={lane} alt={index % 2 === 1} />
  ));

  const pastLastHour = currentTimeLeft >= timelineWidth - HOUR_WIDTH;
  const grid = (
    // zIndex 0 keeps the grid's own stacking (the now line) beneath the
    // pinned header and location column when they overlap it.
    <View style={[styles.gridStack, { width: timelineWidth }]}>
      <TimelineBackground lanes={lanes} hourCount={LAST_HOUR - FIRST_HOUR + 1} />
      {lanes.map((lane) => (
        <LaneRow
          key={lane.key}
          lane={lane}
          firstHour={FIRST_HOUR}
          lastHour={LAST_HOUR}
          timelineWidth={timelineWidth}
          onSelectSession={onSelectSession}
        />
      ))}

      {/* "Now" indicator: a vertical line spanning every lane, with a dot at
          the top. Red while today's schedule is still running, muted once
          the visible day has passed. */}
      {isToday && currentTimeLeft >= 0 && currentTimeLeft <= timelineWidth ? (
        <View
          pointerEvents="none"
          style={[
            styles.currentTimeLine,
            {
              left: currentTimeLeft,
              height: timelineHeight,
              backgroundColor: pastLastHour
                ? UI.textMuted
                : styles.currentTimeLine.backgroundColor,
            },
          ]}>
          <View
            style={[
              styles.currentTimeDot,
              {
                backgroundColor: pastLastHour
                  ? UI.textMuted
                  : styles.currentTimeDot.backgroundColor,
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );

  if (IS_WEB) {
    const contentWidth = LABEL_WIDTH + timelineWidth;
    return (
      <View style={styles.timelineContainer}>
        <View
          ref={webScrollRef}
          style={styles.webScrollBoth}
          onLayout={(event) =>
            setGridViewportWidth(
              Math.max(0, event.nativeEvent.layout.width - LABEL_WIDTH)
            )
          }>
          <View style={{ width: contentWidth }}>
            <View
              style={[
                styles.timelineHeaderRow,
                styles.webStickyTop,
                { width: contentWidth },
              ]}>
              <View
                style={[
                  styles.labelHeader,
                  styles.webStickyLeft,
                  { width: LABEL_WIDTH, height: HEADER_HEIGHT },
                ]}>
                <Text style={styles.labelHeaderText}>LOCATION</Text>
              </View>
              <View
                style={[
                  styles.timeHeader,
                  { height: HEADER_HEIGHT, width: timelineWidth },
                ]}>
                {hourLabels}
              </View>
            </View>

            <View style={styles.timelineFrame}>
              <View
                ref={webLabelColumnRef}
                style={[styles.labelColumn, styles.webStickyLeft]}>
                {laneLabels}
              </View>
              {grid}
            </View>
          </View>
        </View>
        <MoreHint ref={hintRef} direction="down" onPress={scrollToNextLane} />
      </View>
    );
  }

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineHeaderRow}>
        <View
          style={[styles.labelHeader, { width: LABEL_WIDTH, height: HEADER_HEIGHT }]}>
          <Text style={styles.labelHeaderText}>LOCATION</Text>
        </View>

        {/* Not user-scrollable: a clipped window whose content is translated
            by the grid's scroll offset, so it always tracks the grid. */}
        <View
          style={[
            styles.timelineScroller,
            styles.timeHeaderViewport,
            { width: visibleTimelineWidth },
          ]}>
          <Animated.View
            ref={nativeHeaderTrackRef}
            style={[
              styles.timeHeader,
              { height: HEADER_HEIGHT, width: timelineWidth },
              nativeHeaderTrackStyle,
            ]}>
            {hourLabels}
          </Animated.View>
        </View>
      </View>

      <ScrollView
        ref={nativeVerticalRef}
        style={styles.verticalTimeline}
        contentContainerStyle={styles.verticalTimelineContent}
        nestedScrollEnabled
        onLayout={(event) => {
          nativeViewportHeight.current = event.nativeEvent.layout.height;
          updateNativeHidden();
        }}
        onScroll={(event) => {
          nativeScrollY.current = event.nativeEvent.contentOffset.y;
          updateNativeHidden();
        }}
        scrollEventThrottle={16}>
        <View style={styles.timelineFrame}>
          <View style={styles.labelColumn}>{laneLabels}</View>

          <Animated.ScrollView
            ref={nativeScrollRef}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator
            style={[styles.timelineScroller, { width: visibleTimelineWidth }]}
            contentContainerStyle={{ width: timelineWidth }}
            onLayout={(event) => setGridViewportWidth(event.nativeEvent.layout.width)}
            onScroll={handleNativeScroll}
            scrollEventThrottle={16}>
            {grid}
          </Animated.ScrollView>
        </View>
      </ScrollView>
      <MoreHint ref={hintRef} direction="down" onPress={scrollToNextLane} />
    </View>
  );
}
