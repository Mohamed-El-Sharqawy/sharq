// Payday resolution for a period row — SPEC §6.1/FR-PAY-08/EC-21/A10.
import type { IsoDate } from "@sharq/schemas";
import { addDays, daysUntilWeekday } from "./calendar";
import type { GenerationConfig, PaydayWeekday } from "./types";

// §6.1: payday is a property of the period, not a boundary. The payday
// weekday always occurs exactly once inside a weekly [start, end] window
// (Friday = last day, Thursday = second-to-last, mid-week = stored as-is);
// day membership never depends on it.
export function resolvePaydayDate(
  startDate: IsoDate,
  endDate: IsoDate,
  payday: PaydayWeekday,
): IsoDate {
  const candidate = addDays(startDate, daysUntilWeekday(startDate, payday));
  // Defensive only — a 7-day window always contains every weekday.
  return candidate <= endDate ? candidate : endDate;
}

// If the payday date hits a holidays row, apply calendar.paydayHolidayPolicy:
// earlier → nearest earlier non-holiday date, later → next non-holiday date,
// keep → unchanged. Weekly off days are NOT skipped (§6.1 documented
// decision, A10) — only the holidays table is consulted.
export function applyPaydayHolidayShift(
  paydayDate: IsoDate,
  policy: GenerationConfig["paydayHolidayPolicy"],
  holidays: readonly IsoDate[],
): IsoDate {
  const off = new Set<string>(holidays);
  if (policy === "keep" || !off.has(paydayDate)) return paydayDate;
  const step = policy === "earlier" ? -1 : 1;
  let date = paydayDate;
  do {
    date = addDays(date, step);
  } while (off.has(date));
  return date;
}
