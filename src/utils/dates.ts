export function minutesFromMidnight(dateTime: string): number {
  const match = dateTime.match(/T(\d{2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

// Minutes since midnight -> { time: '6:45', period: 'AM' }, split so the
// vertical timeline can stack the period under the time.
export function clockParts(minutes: number): { time: string; period: string } {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return {
    time: `${hour % 12 || 12}:${String(minute).padStart(2, '0')}`,
    period: hour < 12 ? 'AM' : 'PM',
  };
}

export function hourLabel(hour: number): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  if (normalizedHour === 0) return '12 AM';
  if (normalizedHour === 12) return '12 PM';
  return `${normalizedHour % 12} ${normalizedHour < 12 ? 'AM' : 'PM'}`;
}

export function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Lays out every month spanned by `dates` as Sunday-first weeks of exactly
// seven cells: `null` pads the first and last week so each date lands in its
// weekday column.
export function calendarMonths(
  dates: string[]
): { key: string; label: string; weeks: (string | null)[][] }[] {
  if (dates.length === 0) return [];

  const first = new Date(`${dates[0]}T12:00:00`);
  const last = new Date(`${dates[dates.length - 1]}T12:00:00`);
  const months: { key: string; label: string; weeks: (string | null)[][] }[] =
    [];

  const cursor = new Date(first.getFullYear(), first.getMonth(), 1, 12);
  while (
    cursor.getFullYear() < last.getFullYear() ||
    (cursor.getFullYear() === last.getFullYear() &&
      cursor.getMonth() <= last.getMonth())
  ) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = Array(cursor.getDay()).fill(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(localDateKey(new Date(year, month, day, 12)));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (string | null)[][] = [];
    for (let index = 0; index < cells.length; index += 7) {
      weeks.push(cells.slice(index, index + 7));
    }

    months.push({
      key: `${year}-${month}`,
      label: cursor.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
      weeks,
    });
    cursor.setMonth(month + 1);
  }

  return months;
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
