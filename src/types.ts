// Shapes of the scraped schedule JSON (Raw*) and the normalized data the UI
// renders. The PowerShell-generated JSON is imported directly;
// normalizeSession (data/schedule.ts) converts it for the UI.

export type RawSession = {
  Date?: unknown;
  date?: unknown;
  Day?: unknown;
  day?: unknown;
  StartTime?: unknown;
  startTime?: unknown;
  EndTime?: unknown;
  endTime?: unknown;
  Time?: unknown;
  Location?: unknown;
  location?: unknown;
  Rink?: unknown;
  rink?: unknown;
  Activity?: unknown;
  activity?: unknown;
  Description?: unknown;
  description?: unknown;
  EventId?: unknown;
  eventId?: unknown;
  StartDateTime?: unknown;
  EndDateTime?: unknown;
  SourceUrl?: unknown;
  sourceUrl?: unknown;
  SignupUrl?: unknown;
  signupUrl?: unknown;
  MatchConfidence?: unknown;
  matchConfidence?: unknown;
};

export type RawLocation = {
  name?: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
  scheduleUrl?: unknown;
};

export type RawScheduleData =
  | RawSession[]
  | { sessions?: unknown; locations?: unknown };

export type Session = {
  Date: string;
  Day: string;
  Time: string;
  Location: string;
  Rink: string;
  Activity: string;
  Description: string;
  EventId: string;
  MatchConfidence: string;
  StartDateTime: string;
  EndDateTime: string;
  SourceUrl: string;
  RegistrationUrl: string;
};

export type PositionedSession = Session & { level: number };

export type Lane = {
  key: string;
  location: string;
  sessions: PositionedSession[];
  height: number;
};
