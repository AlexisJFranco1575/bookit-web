import {
  addDays,
  formatDay,
  formatInstant,
  formatLocalDateTime,
  isValidDate,
  localDate,
  localTime,
  timeZoneOptions,
  todayIn,
} from './time';

describe('time helpers', () => {
  it('reads the wall-clock time of the business without converting it', () => {
    expect(localTime('2026-11-16T09:00:00-05:00')).toBe('09:00');
    expect(localDate('2026-11-16T09:00:00-05:00')).toBe('2026-11-16');
  });

  it('formats a day and a local date time', () => {
    expect(formatDay('2026-11-16')).toBe('Mon 16 Nov 2026');
    expect(formatLocalDateTime('2026-11-16T09:00:00-05:00')).toBe('Mon 16 Nov 2026, 09:00');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-11-16', -16)).toBe('2026-10-31');
  });

  it('accepts only real calendar dates', () => {
    expect(isValidDate('2026-11-16')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('16/11/2026')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });

  it('shows an instant in the time zone of the business', () => {
    const text = formatInstant('2026-11-16T14:00:00Z', 'America/Guayaquil');

    expect(text).toContain('16 Nov 2026');
    expect(text).toContain('09:00');
  });

  it('returns today as yyyy-MM-dd for any time zone', () => {
    expect(todayIn('America/Guayaquil')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayIn('Not/AZone')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('always offers at least one time zone', () => {
    expect(timeZoneOptions().length).toBeGreaterThan(0);
  });
});