import { type PartialSettingValues, defaultSettingValues } from "./registry";

// Cross-field validation — FR-SET-08 / SPEC §5.5.6. Validates the EFFECTIVE
// settings map (partial update merged over seeded defaults) so a PATCH that
// only touches one side of a rule is still checked against the other side.

export type CrossFieldIssueCode =
  "MIN_EXCEEDS_MAX" | "QUICK_PICK_OUT_OF_BOUNDS" | "TOO_MANY_QUICK_PICKS";

export type CrossFieldIssue = { key: string; code: CrossFieldIssueCode };

// SPEC §5.2 attendance.quickPicks: "≤ 8 items".
const QUICK_PICK_LIMIT = 8;

export function validateSettingsCrossField(
  values: PartialSettingValues,
): CrossFieldIssue[] {
  const effective = {
    ...defaultSettingValues(),
    ...values,
  } as Record<string, unknown>;
  const issues: CrossFieldIssue[] = [];

  const min = effective["attendance.amount.minMinor"] as number;
  const max = effective["attendance.amount.maxMinor"] as number;
  if (min > max) {
    // Bounds are ill-defined — the pick check is skipped on purpose.
    issues.push({
      key: "attendance.amount.minMinor",
      code: "MIN_EXCEEDS_MAX",
    });
    return issues;
  }

  const picks = effective["attendance.quickPicks"] as number[] | undefined;
  if (picks === undefined) return issues;
  if (picks.length > QUICK_PICK_LIMIT) {
    issues.push({ key: "attendance.quickPicks", code: "TOO_MANY_QUICK_PICKS" });
    return issues;
  }
  if (picks.some((p) => p < min || p > max)) {
    issues.push({
      key: "attendance.quickPicks",
      code: "QUICK_PICK_OUT_OF_BOUNDS",
    });
  }
  return issues;
}
