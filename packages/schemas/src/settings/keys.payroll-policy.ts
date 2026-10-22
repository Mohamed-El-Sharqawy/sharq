import { Type, type TLiteral } from "@sinclair/typebox";
import { defineSetting } from "./types";

const WEEKDAY = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;
const PAYDAY = ["sun", "mon", "tue", "wed", "thu", "fri"] as const;

// Type.Literal must see each element's LITERAL type: a plain
// `(codes: readonly string[])` widened the registry's Static to `string`,
// erasing the §5.2 enum contract for every consumer (caught 2026-10-22 by
// Phase 3 row 4's period typing). The mapped tuple keeps per-key precision.
function literalsOf<const C extends readonly string[]>(
  codes: C,
): { -readonly [K in keyof C]: TLiteral<C[K] & string> } {
  return codes.map((c) => Type.Literal(c)) as {
    -readonly [K in keyof C]: TLiteral<C[K] & string>;
  };
}

// SPEC §5.2 — payroll.* / policy.* / deduction.* / calendar.* scalar keys.
export const PAYROLL_POLICY_SETTINGS = {
  "payroll.weekStartDay": defineSetting(
    "payroll.weekStartDay",
    Type.Union(literalsOf(WEEKDAY)),
    "sat",
    "future-periods",
  ),
  "payroll.payday": defineSetting(
    "payroll.payday",
    Type.Union(literalsOf(PAYDAY)),
    "fri",
    "future-periods",
  ),
  "policy.canSupervisorLock": defineSetting(
    "policy.canSupervisorLock",
    Type.Boolean(),
    true,
  ),
  "policy.canSupervisorMarkPaid": defineSetting(
    "policy.canSupervisorMarkPaid",
    Type.Boolean(),
    false,
  ),
  "policy.canAdminUnlockPaid": defineSetting(
    "policy.canAdminUnlockPaid",
    Type.Boolean(),
    true,
  ),
  "deduction.allowExceedDayPay": defineSetting(
    "deduction.allowExceedDayPay",
    Type.Boolean(),
    false,
  ),
  "deduction.allowExceedWeeklyTotal": defineSetting(
    "deduction.allowExceedWeeklyTotal",
    Type.Boolean(),
    false,
  ),
  "deduction.floorAtZero": defineSetting(
    "deduction.floorAtZero",
    Type.Boolean(),
    true,
  ),
  "deduction.maxPerEntryMinor": defineSetting(
    "deduction.maxPerEntryMinor",
    Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    null,
  ),
  "calendar.weeklyOffDays": defineSetting(
    "calendar.weeklyOffDays",
    Type.Array(Type.Union(literalsOf(WEEKDAY)), { uniqueItems: true }),
    ["fri"],
    "future-periods",
  ),
  "calendar.paydayHolidayPolicy": defineSetting(
    "calendar.paydayHolidayPolicy",
    Type.Union([
      Type.Literal("earlier"),
      Type.Literal("later"),
      Type.Literal("keep"),
    ]),
    "earlier",
    "future-periods",
  ),
} as const;
