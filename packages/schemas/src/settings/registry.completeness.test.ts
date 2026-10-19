import { describe, expect, test } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { SETTINGS_REGISTRY, type SettingDefinition } from "../index";

// Runtime lookup view: a missing key must FAIL these specs with a message,
// not break compilation of the package.
const byKey = Object.fromEntries(Object.entries(SETTINGS_REGISTRY)) as Record<
  string,
  SettingDefinition
>;

// SPEC §5.2 scalar registry keys, verbatim. The four table rows (pay_rates,
// reason_catalog, attendance_statuses, holidays) are dedicated tables per
// SPEC §5.1 — they are not registry keys; their schemas land with their
// owning roadmap rows.
const SPEC_SETTING_KEYS = [
  "payroll.weekStartDay",
  "payroll.payday",
  "attendance.amount.minMinor",
  "attendance.amount.maxMinor",
  "attendance.quickPicks",
  "attendance.entryMode",
  "attendance.reason.requiredOnOverride",
  "attendance.reason.requiredOnDeduction",
  "attendance.reason.minLength",
  "attendance.reason.allowFreeText",
  "attendance.editWindow.daysBack",
  "attendance.editWindow.blockFutureDays",
  "attendance.editWindow.autoLockDaysAfterPeriodEnd",
  "policy.canSupervisorLock",
  "policy.canSupervisorMarkPaid",
  "policy.canAdminUnlockPaid",
  "deduction.allowExceedDayPay",
  "deduction.allowExceedWeeklyTotal",
  "deduction.floorAtZero",
  "deduction.maxPerEntryMinor",
  "currency.code",
  "currency.minorUnitScale",
  "format.digitStyle",
  "branding.companyName",
  "branding.logoUrl",
  "export.headerText",
  "export.columns",
  "export.filenamePattern",
  "calendar.weeklyOffDays",
  "calendar.paydayHolidayPolicy",
  "security.sessionIdleMinutes",
  "security.minPasswordLength",
] as const;

// SPEC §5.2 "Seeded default" column + §5.6 seeds. Money in minor units
// (EGP ×100, scale 2) — 400 EGP = 40000, 5000 EGP = 500000.
const SPEC_DEFAULTS: Record<string, unknown> = {
  "payroll.weekStartDay": "sat",
  "payroll.payday": "fri",
  "attendance.amount.minMinor": 0,
  "attendance.amount.maxMinor": 500000,
  "attendance.quickPicks": [40000, 60000, 80000],
  "attendance.entryMode": "free",
  "attendance.reason.requiredOnOverride": true,
  "attendance.reason.requiredOnDeduction": true,
  "attendance.reason.minLength": 3,
  "attendance.reason.allowFreeText": true,
  "attendance.editWindow.daysBack": 7,
  "attendance.editWindow.blockFutureDays": true,
  "attendance.editWindow.autoLockDaysAfterPeriodEnd": null,
  "policy.canSupervisorLock": true,
  "policy.canSupervisorMarkPaid": false,
  "policy.canAdminUnlockPaid": true,
  "deduction.allowExceedDayPay": false,
  "deduction.allowExceedWeeklyTotal": false,
  "deduction.floorAtZero": true,
  "deduction.maxPerEntryMinor": null,
  "currency.code": "EGP",
  "currency.minorUnitScale": 2,
  "format.digitStyle": "western",
  "branding.companyName": "شرق",
  "branding.logoUrl": null,
  "export.headerText": "شرق — كشف مرتبات {team} — أسبوع {period}",
  "export.columns": [
    "name",
    "sat",
    "sun",
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "deductions",
    "adjustments",
    "total",
  ],
  "export.filenamePattern": "sharq-{team}-{from}-{to}.xlsx",
  "calendar.weeklyOffDays": ["fri"],
  "calendar.paydayHolidayPolicy": "earlier",
  "security.sessionIdleMinutes": 240,
  "security.minPasswordLength": 8,
};

describe("FR-SET-01 settings registry completeness (TESTING §6.2)", () => {
  test("every SPEC §5.2 scalar key is registered", () => {
    for (const key of SPEC_SETTING_KEYS) {
      expect(
        Object.hasOwn(SETTINGS_REGISTRY, key),
        `missing registry key: ${key}`,
      ).toBe(true);
    }
  });

  test("registry carries no keys beyond SPEC §5.2", () => {
    const extra = Object.keys(SETTINGS_REGISTRY).filter(
      (k) =>
        !SPEC_SETTING_KEYS.includes(k as (typeof SPEC_SETTING_KEYS)[number]),
    );
    expect(extra, `unexpected registry keys: ${extra.join(", ")}`).toEqual([]);
  });

  test("every entry has schema + seeded default + scope/dating/edit/impact metadata", () => {
    for (const [key, entry] of Object.entries(SETTINGS_REGISTRY)) {
      expect(entry.key, `${key}: key mismatch`).toBe(key);
      expect(entry.schema, `${key}: schema missing`).toBeDefined();
      expect(
        entry.seededDefault,
        `${key}: seeded default missing (a new key without a default must fail)`,
      ).toBeDefined();
      expect(entry.scope, `${key}: scope`).toBe("company");
      expect(entry.dating, `${key}: dating`).toBe("immediate");
      expect(entry.edit, `${key}: edit permission`).toBe("admin");
      expect(
        ["future-periods", "future-entries", "none"],
        `${key}: impact descriptor`,
      ).toContain(entry.impact);
    }
  });

  test("null-seeded keys are the only null defaults and are explicit nulls", () => {
    const nullKeys = SPEC_SETTING_KEYS.filter((k) => SPEC_DEFAULTS[k] === null);
    for (const key of nullKeys) {
      expect(byKey[key], `${key}: registry entry missing`).toBeDefined();
      expect(byKey[key]!.seededDefault, `${key}: null default`).toBe(null);
    }
  });

  test("every seeded default validates against its own schema", () => {
    for (const [key, entry] of Object.entries(SETTINGS_REGISTRY)) {
      expect(
        Value.Check(entry.schema, entry.seededDefault),
        `${key}: seeded default fails its own schema`,
      ).toBe(true);
    }
  });

  test("seeded defaults match SPEC §5.2/§5.6 exactly", () => {
    for (const [key, expected] of Object.entries(SPEC_DEFAULTS)) {
      expect(byKey[key], `${key}: registry entry missing`).toBeDefined();
      expect(
        byKey[key]!.seededDefault,
        `${key}: default must match SPEC`,
      ).toEqual(expected);
    }
  });
});
