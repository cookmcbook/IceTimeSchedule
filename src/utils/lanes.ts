import { EVENT_GAP, EVENT_HEIGHT, LANE_PADDING } from '../constants';
import type { Lane, PositionedSession, Session } from '../types';
import { minutesFromMidnight } from './dates';

export function buildLane(key: string, laneSessions: Session[]): Lane {
  const sorted = [...laneSessions].sort(
    (a, b) =>
      minutesFromMidnight(a.StartDateTime) -
      minutesFromMidnight(b.StartDateTime) ||
      minutesFromMidnight(a.EndDateTime) - minutesFromMidnight(b.EndDateTime)
  );

  const levelEndTimes: number[] = [];

  const positioned = sorted.map((session): PositionedSession => {
    const start = minutesFromMidnight(session.StartDateTime);
    const end = minutesFromMidnight(session.EndDateTime);

    let level = levelEndTimes.findIndex((existingEnd) => existingEnd <= start);
    if (level === -1) {
      level = levelEndTimes.length;
      levelEndTimes.push(end);
    } else {
      levelEndTimes[level] = end;
    }

    return { ...session, level };
  });

  const levelCount = Math.max(1, levelEndTimes.length);

  return {
    key,
    location: key,
    sessions: positioned,
    height:
      LANE_PADDING * 2 +
      levelCount * EVENT_HEIGHT +
      Math.max(0, levelCount - 1) * EVENT_GAP,
  };
}
