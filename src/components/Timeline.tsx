import React, { useCallback, useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EVENT_GAP, EVENT_HEIGHT, HOUR_WIDTH, LANE_PADDING } from '../constants';
import { ThemeContext } from '../theme/ThemeContext';
import type { Lane, PositionedSession, Session } from '../types';
import { activityColor } from '../utils/colors';
import { minutesFromMidnight } from '../utils/dates';

// ---------------------------------------------------------------------------
// EVENT CARD
// Memoized so a `now` tick (every 60s, re-rendering ScheduleApp for the red
// line) doesn't re-render every event chip in every lane — only props that
// actually change (selection, theme) cause a re-render.
// ---------------------------------------------------------------------------
export const EventCard = React.memo(function EventCard({
  session,
  left,
  top,
  width,
  onPress,
}: {
  session: PositionedSession;
  left: number;
  top: number;
  width: number;
  onPress: (session: Session) => void;
}) {
  const { styles } = useContext(ThemeContext);
  const handlePress = useCallback(() => onPress(session), [onPress, session]);

  // Same card as the vertical timeline, but the activity color runs along
  // the top edge instead of down the left side.
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${session.Activity} at ${session.Rink}, ${session.Time}`}
      style={[
        styles.event,
        {
          left: left + 3,
          top,
          width,
          borderTopColor: activityColor(session.Activity),
        },
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

// ---------------------------------------------------------------------------
// LANE LABEL (left column) + LANE ROW (scrolling grid content)
// Split into their own memoized components, keyed by lane, so adding or
// resizing one lane doesn't force every other lane's events to re-render.
// ---------------------------------------------------------------------------
export const LaneLabelRow = React.memo(function LaneLabelRow({
  lane,
  alt,
}: {
  lane: Lane;
  alt: boolean;
}) {
  const { styles } = useContext(ThemeContext);
  return (
    <View
      style={[
        styles.laneLabel,
        alt && styles.laneLabelAlt,
        { height: lane.height },
      ]}>
      <Text style={styles.locationText}>{lane.location}</Text>
    </View>
  );
});

// Lane stripes and hour grid lines for the whole grid, drawn once behind the
// (transparent) lane rows rather than repeating every grid line in each lane.
export const TimelineBackground = React.memo(function TimelineBackground({
  lanes,
  hourCount,
}: {
  lanes: Lane[];
  hourCount: number;
}) {
  const { styles } = useContext(ThemeContext);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {lanes.map((lane, index) => (
        <View
          key={lane.key}
          style={[
            styles.laneStripe,
            index % 2 === 1 && styles.laneAlt,
            { height: lane.height },
          ]}
        />
      ))}
      {Array.from({ length: hourCount }, (_, index) => (
        <View
          key={index}
          style={[styles.gridLine, { left: index * HOUR_WIDTH }]}
        />
      ))}
    </View>
  );
});

export const LaneRow = React.memo(function LaneRow({
  lane,
  firstHour,
  lastHour,
  timelineWidth,
  onSelectSession,
}: {
  lane: Lane;
  firstHour: number;
  lastHour: number;
  timelineWidth: number;
  onSelectSession: (session: Session) => void;
}) {
  const { styles } = useContext(ThemeContext);

  return (
    <View
      style={[styles.lane, { height: lane.height, width: timelineWidth }]}>
      {lane.sessions.map((session) => {
        const start = minutesFromMidnight(session.StartDateTime);
        const end = minutesFromMidnight(session.EndDateTime);
        const visibleStart = Math.max(start, firstHour * 60);
        const visibleEnd = Math.min(end, lastHour * 60);
        if (visibleEnd <= visibleStart) return null;

        const left = ((visibleStart - firstHour * 60) / 60) * HOUR_WIDTH;
        const calculatedWidth =
          ((visibleEnd - visibleStart) / 60) * HOUR_WIDTH - 6;
        const width = Math.max(58, calculatedWidth);
        const top = LANE_PADDING + session.level * (EVENT_HEIGHT + EVENT_GAP);

        return (
          <EventCard
            key={`${session.EventId}-${session.Rink}-${session.StartDateTime}`}
            session={session}
            left={left}
            top={top}
            width={width}
            onPress={onSelectSession}
          />
        );
      })}
    </View>
  );
});
