// ---------------------------------------------------------------------------
// JSON NORMALIZATION
// Converts the scraped schedule-data.json (imported in ScheduleApp) into the
// Session shape the UI renders.
// ---------------------------------------------------------------------------
import type { RawLocation, RawScheduleData, RawSession, Session } from '../types';

// Fallback addresses, used only if a location is missing from the scraped
// schedule-data.json (e.g. a brand-new rink not yet in the feed). The
// authoritative source is scheduleData.locations, built in the PS1 script.
const FALLBACK_LOCATION_ADDRESSES: Record<string, string> = {
  Euless: '1400 South Pipeline Road, Euless, TX 76040',
  'Farmers Branch': '12700 N Stemmons Fwy, Farmers Branch, TX 75234',
  Frisco: '2601 Avenue of the Stars, Frisco, TX 75034',
  Mansfield: '1715 E. Broad Street, Mansfield, TX 76063',
  McKinney: '6993 Stars Avenue, McKinney, TX 75070',
  Northlake: '13850 Chadwick Pkwy, Northlake, TX 76262',
  Plano: '4020 West Plano Parkway, Plano, TX 75093',
  Richardson: '522 Centennial Blvd., Richardson, TX 75081',
};

function textValue(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function localDateTime(date: string, time: string): string {
  if (!date || !time) return '';

  const match = time
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) {
    if (__DEV__) {
      console.warn(
        `[schedule] Could not parse time "${time}" on ${date}; session will be dropped.`
      );
    }
    return '';
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (period === 'AM' && hour === 12) hour = 0;
  if (period === 'PM' && hour !== 12) hour += 12;

  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(
    2,
    '0'
  )}:00`;
}

export function normalizeSession(
  row: RawSession,
  scheduleUrls: Record<string, string>
): Session {
  const date = textValue(row.Date ?? row.date);
  const startTime = textValue(row.StartTime ?? row.startTime);
  const endTime = textValue(row.EndTime ?? row.endTime);
  const startDateTime =
    textValue(row.StartDateTime) || localDateTime(date, startTime);
  const endDateTime =
    textValue(row.EndDateTime) || localDateTime(date, endTime);
  const location = textValue(row.Location ?? row.location, 'Unknown location');

  return {
    Date: date,
    Day: textValue(row.Day ?? row.day),
    Time:
      textValue(row.Time) ||
      (startTime && endTime ? `${startTime}-${endTime}` : ''),
    Location: location,
    Rink: textValue(row.Rink ?? row.rink, 'Unknown rink'),
    Activity: textValue(row.Activity ?? row.activity, 'Uncategorized'),
    Description: textValue(row.Description ?? row.description),
    EventId: textValue(row.EventId ?? row.eventId),
    MatchConfidence: textValue(row.MatchConfidence ?? row.matchConfidence),
    StartDateTime: startDateTime,
    EndDateTime: endDateTime,
    // Every session at a location shares its schedule page, so the JSON
    // stores it once per location rather than on each session.
    SourceUrl: textValue(row.SourceUrl ?? row.sourceUrl) || scheduleUrls[location] || '',
    // Confidence gating happens in the UI (SessionDetailModal), not here, so
    // the button label can tell the user whether a match was certain or a
    // best guess. Unmatched ('none') sessions have no signupUrl.
    RegistrationUrl: textValue(row.SignupUrl ?? row.signupUrl),
  };
}

export function rawSessionsFromData(value: RawScheduleData): RawSession[] {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.sessions)) {
    return value.sessions as RawSession[];
  }
  return [];
}

function rawLocationsFromData(value: RawScheduleData): RawLocation[] {
  return !Array.isArray(value) && value && Array.isArray(value.locations)
    ? (value.locations as RawLocation[])
    : [];
}

export function scheduleUrlsFromData(value: RawScheduleData): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const location of rawLocationsFromData(value)) {
    const name = textValue(location?.name);
    const url = textValue(location?.scheduleUrl);
    if (name && url) urls[name] = url;
  }
  return urls;
}

export function locationAddressesFromData(
  value: RawScheduleData
): Record<string, string> {
  const addresses: Record<string, string> = {};

  for (const location of rawLocationsFromData(value)) {
    if (!location) continue;
    const name = textValue(location.name);
    if (!name) continue;
    const address = textValue(location.address);
    const city = textValue(location.city);
    const state = textValue(location.state);
    const postalCode = textValue(location.postalCode);
    const full = [address, [city, state].filter(Boolean).join(', ')]
      .filter(Boolean)
      .join(', ');
    addresses[name] = postalCode ? `${full} ${postalCode}` : full;
  }

  // Fill in anything the feed didn't provide (e.g. a rink missing from a
  // partial/failed scrape) with the last-known-good fallback table.
  return { ...FALLBACK_LOCATION_ADDRESSES, ...addresses };
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}
