// Config date math + the §5.5 change-safety guards, as pure label helpers
// plus guard functions over the ConfigGuardsRepo port. Day labels are UTC-
// anchored (membership-dates.ts pattern); the Cairo boundary stays at the
// plugin layer (cairo-today.ts).
import type { ConfigGuardsRepo } from "./types";

export function nextDay(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

/** Inclusive-range overlap on day labels (2026-10-19 decision): two rows
 * conflict when each starts at-or-before the other's last day. */
export function overlapsInclusive(
  a: { validFrom: string; validTo: string | null },
  b: { validFrom: string; validTo: string | null },
): boolean {
  const aEnd = a.validTo ?? "9999-12-31";
  const bEnd = b.validTo ?? "9999-12-31";
  return a.validFrom <= bEnd && b.validFrom <= aEnd;
}

export type PeriodProblem = "PERIOD_LOCKED" | "PERIOD_PAID";

/** FR-SET-09/EC-42 — a boundary date inside a locked/paid period is not
 * writable; paid wins when both kinds cover the date. */
export async function guardDateWritable(
  guards: ConfigGuardsRepo,
  date: string,
): Promise<PeriodProblem | null> {
  const state = await guards.strictestPeriodStateCovering(date);
  if (state === "paid") return "PERIOD_PAID";
  if (state === "locked") return "PERIOD_LOCKED";
  return null;
}

/** EC-56 — a closed row must be followed by a successor row starting
 * exactly the next day (overlap-freedom makes "covers D+1" ⇔ "starts
 * D+1"). The row being closed can never match: it starts ≤ its own
 * validTo < dayAfterClose. */
export function successorAt<T extends { validFrom: string }>(
  rows: T[],
  dayAfterClose: string,
): T | undefined {
  return rows.find((r) => r.validFrom === dayAfterClose);
}
