// generatePeriods — SPEC §6.1/FR-PAY-01/FR-PAY-09. Pure: same inputs → same
// drafts (the idempotency core; the service layer dedupes against stored rows
// via the §7 unique(team_id, start_date) and never mutates existing rows).
import type { IsoDate } from "@sharq/schemas";
import { addDays, daysUntilWeekday } from "./calendar";
import { applyPaydayHolidayShift, resolvePaydayDate } from "./payday";
import type { GenerationAnchor, GenerationConfig, PeriodDraft } from "./types";

// A fresh team's first period starts on the first weekStartDay on/after
// fromDate — generation is forward-only, never reaching before the request.
function firstStartFrom(fromDate: IsoDate, config: GenerationConfig): IsoDate {
  return addDays(fromDate, daysUntilWeekday(fromDate, config.weekStartDay));
}

// Continuation starts EXACTLY at last.end_date + 1 day under the CURRENT
// config (FR-PAY-09/EC-22): a weekStartDay/payday change never regenerates
// or realigns past periods — the boundary chain stays gap-free and
// overlap-free by construction.
export function generatePeriods(
  teamId: string,
  anchor: GenerationAnchor,
  config: GenerationConfig,
  count: number,
): PeriodDraft[] {
  const periods: PeriodDraft[] = [];
  const firstStart =
    anchor.kind === "afterLast"
      ? addDays(anchor.lastEndDate, 1)
      : firstStartFrom(anchor.fromDate, config);
  for (let i = 0; i < count; i++) {
    // periods[i-1] exists for every i ≥ 1 (pushed on the prior iteration).
    const startDate =
      i === 0 ? firstStart : addDays(periods[i - 1]!.endDate, 1);
    // Weekly today (§6.1); other lengths join here later without touching
    // any consumer — the start chain is the only coupling.
    const endDate = addDays(startDate, 6);
    periods.push({
      teamId,
      startDate,
      endDate,
      paydayDate: applyPaydayHolidayShift(
        resolvePaydayDate(startDate, endDate, config.payday),
        config.paydayHolidayPolicy,
        config.holidays,
      ),
    });
  }
  return periods;
}
