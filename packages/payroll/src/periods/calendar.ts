// Date-only calendar arithmetic for period generation (§6.1). All math runs
// in UTC on purpose: the inputs are zone-less ISO strings and Africa/Cairo
// has no date-level DST effect (EC-28), so UTC is exact and drift-free.
import type { IsoDate } from "@sharq/schemas";

const MS_PER_DAY = 86_400_000;

const WEEKDAY_INDEX = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
} as const;

export type WeekdayCode = keyof typeof WEEKDAY_INDEX;

function utcAt(iso: IsoDate): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return new Date(utcAt(iso) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

// 0 = Sunday … 6 = Saturday (getUTCDay order).
export function weekdayIndexOf(code: WeekdayCode): number {
  return WEEKDAY_INDEX[code];
}

// Days from `from` until the next (or same) occurrence of `code`: 0..6.
export function daysUntilWeekday(from: IsoDate, code: WeekdayCode): number {
  const target = weekdayIndexOf(code);
  return (target - new Date(utcAt(from)).getUTCDay() + 7) % 7;
}
