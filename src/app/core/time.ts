const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const FALLBACK_ZONES = [
  'America/Guayaquil',
  'America/Bogota',
  'America/Lima',
  'America/Mexico_City',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Europe/Madrid',
  'Europe/London',
  'UTC',
];

function parseDate(date: string): Date | null {
  const match = DATE_PATTERN.exec(date);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = new Date(Date.UTC(year, month - 1, day));
  const valid =
    value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;

  return valid ? value : null;
}

/** True for a real calendar date written as yyyy-MM-dd. */
export function isValidDate(date: string): boolean {
  return parseDate(date) !== null;
}

/** Adds days to a yyyy-MM-dd date without involving the time zone of the browser. */
export function addDays(date: string, days: number): string {
  const value = parseDate(date);
  if (!value) {
    return date;
  }

  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** "2026-11-16T09:00:00-05:00" -> "09:00": the wall-clock time of the business, with no conversion. */
export function localTime(iso: string): string {
  return iso.slice(11, 16);
}

/** "2026-11-16T09:00:00-05:00" -> "2026-11-16". */
export function localDate(iso: string): string {
  return iso.slice(0, 10);
}

/** "2026-11-16" -> "Mon 16 Nov 2026". */
export function formatDay(date: string): string {
  const value = parseDate(date);
  if (!value) {
    return date;
  }

  return `${WEEKDAYS[value.getUTCDay()]} ${value.getUTCDate()} ${MONTHS[value.getUTCMonth()]} ${value.getUTCFullYear()}`;
}

/** "2026-11-16T09:00:00-05:00" -> "Mon 16 Nov 2026, 09:00". */
export function formatLocalDateTime(iso: string): string {
  return `${formatDay(localDate(iso))}, ${localTime(iso)}`;
}

/** Shows an instant in the given time zone, or in the time zone of the device when none is given. */
export function formatInstant(iso: string, timeZoneId?: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZoneId,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Today's date (yyyy-MM-dd) in the time zone of a business. */
export function todayIn(timeZoneId: string): string {
  try {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZoneId,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    if (DATE_PATTERN.test(formatted)) {
      return formatted;
    }
  } catch {
    // Unknown time zone: fall through to UTC.
  }

  return new Date().toISOString().slice(0, 10);
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** All IANA time zones the browser knows, with the time zone of the device always included. */
export function timeZoneOptions(): string[] {
  let zones: string[] = [];

  try {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    zones = intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    zones = [];
  }

  if (zones.length === 0) {
    zones = [...FALLBACK_ZONES];
  }

  const own = browserTimeZone();
  return zones.includes(own) ? zones : [own, ...zones];
}