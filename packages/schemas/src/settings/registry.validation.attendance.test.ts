import { describe, test } from "bun:test";
import { runSchemaCases, type SchemaCase } from "./schema-cases";

const EIGHT = [1, 2, 3, 4, 5, 6, 7, 8];

const CASES: SchemaCase[] = [
  ["attendance.amount.minMinor", "zero allowed", 0, true],
  ["attendance.amount.minMinor", "negative rejected", -1, false],
  ["attendance.amount.minMinor", "fraction rejected", 1.5, false],
  ["attendance.amount.maxMinor", "integer minor", 500000, true],
  ["attendance.amount.maxMinor", "string rejected", "500000", false],
  ["attendance.quickPicks", "eight picks allowed", EIGHT, true],
  [
    "attendance.quickPicks",
    "nine picks rejected",
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    false,
  ],
  ["attendance.quickPicks", "string item rejected", ["40000"], false],
  ["attendance.entryMode", "quick_picks_only", "quick_picks_only", true],
  ["attendance.entryMode", "unknown mode", "quick", false],
  ["attendance.reason.requiredOnOverride", "boolean", false, true],
  ["attendance.reason.requiredOnOverride", "string rejected", "true", false],
  ["attendance.reason.minLength", "lower bound 2", 2, true],
  ["attendance.reason.minLength", "upper bound 20", 20, true],
  ["attendance.reason.minLength", "below 2 rejected", 1, false],
  ["attendance.reason.minLength", "above 20 rejected", 21, false],
  ["attendance.editWindow.daysBack", "0 allowed", 0, true],
  ["attendance.editWindow.daysBack", "90 allowed", 90, true],
  ["attendance.editWindow.daysBack", "91 rejected", 91, false],
  ["attendance.editWindow.daysBack", "negative rejected", -1, false],
  [
    "attendance.editWindow.autoLockDaysAfterPeriodEnd",
    "null = off",
    null,
    true,
  ],
  ["attendance.editWindow.autoLockDaysAfterPeriodEnd", "1 allowed", 1, true],
  ["attendance.editWindow.autoLockDaysAfterPeriodEnd", "30 allowed", 30, true],
  ["attendance.editWindow.autoLockDaysAfterPeriodEnd", "0 rejected", 0, false],
  [
    "attendance.editWindow.autoLockDaysAfterPeriodEnd",
    "31 rejected",
    31,
    false,
  ],
];

describe("FR-SET-01 attendance.* schemas (SPEC §5.2)", () => {
  test("accepts and rejects exactly the §5.2 shapes", () => {
    runSchemaCases(CASES);
  });
});
