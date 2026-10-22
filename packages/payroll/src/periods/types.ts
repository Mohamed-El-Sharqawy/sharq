// Period generation types — SPEC §6.1. Periods exist only as stored rows
// (§7 pay_periods); the generator is pure and produces drafts the service
// layer persists (state starts open; snapshots land on lock).
import type { IsoDate, SettingValues } from "@sharq/schemas";

export type WeekStartDay = SettingValues["payroll.weekStartDay"];
export type PaydayWeekday = SettingValues["payroll.payday"];
export type PaydayHolidayPolicy = SettingValues["calendar.paydayHolidayPolicy"];

// §6.1 generation config — resolved settings + the holiday table.
// weeklyOffDays is deliberately absent: the payday holiday shift skips
// holidays only, never weekly off days (§6.1 FR-PAY-08, decision A10).
export type GenerationConfig = {
  weekStartDay: WeekStartDay;
  payday: PaydayWeekday;
  paydayHolidayPolicy: PaydayHolidayPolicy;
  holidays: IsoDate[];
};

// §6.1 anchors: a fresh team anchors at the first weekStartDay on/after
// fromDate (forward-only); continuation anchors EXACTLY at last.end_date + 1
// day (FR-PAY-09/EC-22 — a weekStartDay change never realigns the chain).
export type GenerationAnchor =
  | { kind: "fromDate"; fromDate: IsoDate }
  | { kind: "afterLast"; lastEndDate: IsoDate };

// The pure §7 pay_periods date fields; id/state/configSnapshot/lifecycle
// columns belong to the service layer (§6.4) and never come from here.
export type PeriodDraft = {
  teamId: string;
  startDate: IsoDate;
  endDate: IsoDate;
  paydayDate: IsoDate;
};
