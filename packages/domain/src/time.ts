export type ZonedDateParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: string };

export function zonedDateParts(instant: Date | string, timeZone: string, locale = 'en-US'): ZonedDateParts {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) throw new RangeError('instant must be a valid ISO timestamp');
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
    weekday: 'long', hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return { year: Number(value('year')), month: Number(value('month')), day: Number(value('day')), hour: Number(value('hour')), minute: Number(value('minute')), weekday: value('weekday') ?? '' };
}

export function elapsedMinutes(start: Date | string, end: Date | string): number {
  const from = typeof start === 'string' ? new Date(start) : start;
  const to = typeof end === 'string' ? new Date(end) : end;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) throw new RangeError('timestamps must be valid and chronological');
  return (to.getTime() - from.getTime()) / 60_000;
}

export function splitOvernight(startMinute: number, durationMinutes: number, dayMinutes = 1_440): Array<{ dayOffset: number; startMinute: number; durationMinutes: number }> {
  if (!Number.isInteger(startMinute) || !Number.isInteger(durationMinutes) || startMinute < 0 || startMinute >= dayMinutes || durationMinutes <= 0) throw new RangeError('invalid schedule interval');
  const segments: Array<{ dayOffset: number; startMinute: number; durationMinutes: number }> = [];
  let remaining = durationMinutes;
  let cursor = startMinute;
  let dayOffset = 0;
  while (remaining > 0) {
    const length = Math.min(remaining, dayMinutes - cursor);
    segments.push({ dayOffset, startMinute: cursor, durationMinutes: length });
    remaining -= length; dayOffset += 1; cursor = 0;
  }
  return segments;
}
