// Shared date semantics for the resolver — SPEC §5.3/§5.4. ISO date strings
// (yyyy-mm-dd) compare lexicographically = chronologically, so all math here
// is pure string comparison: date-only, DST-safe, no timezone drift (EC-28).
import type { IsoDate } from "@sharq/schemas";
import type { DatedRow, MembershipSpan } from "./types";

// A dated row covers `date` iff valid_from ≤ date ≤ valid_to (valid_to
// INCLUSIVE; null = open-ended). The DB exclusion constraint uses [) range
// bounds and misses boundary days — this comparison is the binding semantics
// (standing decision 2026-10-19): never use range math on valid_to.
export function coversDate(row: DatedRow, date: IsoDate): boolean {
  return row.validFrom <= date && (row.validTo === null || date <= row.validTo);
}

type Dated = { validFrom: IsoDate };

// Deterministic pick among covering rows: the latest valid_from wins. Rows
// should never tie within a scope level (§7 uniques) — on a defensive tie the
// last candidate wins, keeping the function total and order-stable.
export function latestFrom<T extends Dated>(rows: T[]): T | null {
  return rows.reduce<T | null>(
    (best, row) =>
      best === null || best.validFrom <= row.validFrom ? row : best,
    null,
  );
}

// §5.3: "the team he belonged to on that date (membership ranges)" — a
// mid-week transfer changes the team default from the transfer date only.
export function membershipTeamAt(
  memberships: MembershipSpan[],
  date: IsoDate,
): string | null {
  const span = latestFrom(memberships.filter((m) => coversDate(m, date)));
  return span === null ? null : span.teamId;
}
