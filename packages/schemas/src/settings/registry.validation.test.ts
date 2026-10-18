import { describe, test, expect } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { SETTINGS_REGISTRY } from "../index";

// Per-key schema acceptance/rejection driven by the SPEC §5.2 "Type &
// validation" column. Each case: key, label, value, expected validity.
type SchemaCase = { key: string; label: string; value: unknown; valid: boolean };

const CASES: SchemaCase[] = [
  // payroll.* — weekday enums (weekStartDay sat..fri; payday sun..fri, no sat)
  { key: "payroll.weekStartDay", label: "each weekday code", value: "sun", valid: true },
  { key: "payroll.weekStartDay", label: "full name rejected", value: "Saturday", valid: false },
  { key: "payroll.payday", label: "thursday code", value: "thu", valid: true },
  { key: "payroll.payday", label: "saturday outside enum", value: "sat", valid: false },
  // attendance.amount.* — integer minor units
  { key: "attendance.amount.minMinor", label: "zero allowed", value: 0, valid: true },
  { key: "attendance.amount.minMinor", label: "negative rejected", value: -1, valid: false },
  { key: "attendance.amount.minMinor", label: "fraction rejected", value: 1.5, valid: false },
  { key: "attendance.amount.maxMinor", label: "integer minor", value: 500000, valid: true },
  { key: "attendance.amount.maxMinor", label: "string rejected", value: "500000", valid: false },
  // attendance.quickPicks — ≤ 8 int minor items
  { key: "attendance.quickPicks", label: "eight picks allowed", value: [1, 2, 3, 4, 5, 6, 7, 8], valid: true },
  { key: "attendance.quickPicks", label: "nine picks rejected", value: [1, 2, 3, 4, 5, 6, 7, 8, 9], valid: false },
  { key: "attendance.quickPicks", label: "string item rejected", value: ["40000"], valid: false },
  // attendance.entryMode
  { key: "attendance.entryMode", label: "quick_picks_only", value: "quick_picks_only", valid: true },
  { key: "attendance.entryMode", label: "unknown mode", value: "quick", valid: false },
  // attendance.reason.*
  { key: "attendance.reason.requiredOnOverride", label: "boolean", value: false, valid: true },
  { key: "attendance.reason.requiredOnOverride", label: "string rejected", value: "true", valid: false },
  { key: "attendance.reason.minLength", label: "lower bound 2", value: 2, valid: true },
  { key: "attendance.reason.minLength", label: "upper bound 20", value: 20, valid: true },
  { key: "attendance.reason.minLength", label: "below 2 rejected", value: 1, valid: false },
  { key: "attendance.reason.minLength", label: "above 20 rejected", value: 21, valid: false },
  // attendance.editWindow.*
  { key: "attendance.editWindow.daysBack", label: "0 allowed", value: 0, valid: true },
  { key: "attendance.editWindow.daysBack", label: "90 allowed", value: 90, valid: true },
  { key: "attendance.editWindow.daysBack", label: "91 rejected", value: 91, valid: false },
  { key: "attendance.editWindow.daysBack", label: "negative rejected", value: -1, valid: false },
  { key: "attendance.editWindow.autoLockDaysAfterPeriodEnd", label: "null = off", value: null, valid: true },
  { key: "attendance.editWindow.autoLockDaysAfterPeriodEnd", label: "1 allowed", value: 1, valid: true },
  { key: "attendance.editWindow.autoLockDaysAfterPeriodEnd", label: "30 allowed", value: 30, valid: true },
  { key: "attendance.editWindow.autoLockDaysAfterPeriodEnd", label: "0 rejected", value: 0, valid: false },
  { key: "attendance.editWindow.autoLockDaysAfterPeriodEnd", label: "31 rejected", value: 31, valid: false },
  // policy.* / deduction.* booleans + nullable max
  { key: "policy.canSupervisorMarkPaid", label: "boolean", value: true, valid: true },
  { key: "deduction.allowExceedDayPay", label: "string rejected", value: "no", valid: false },
  { key: "deduction.maxPerEntryMinor", label: "null = no cap", value: null, valid: true },
  { key: "deduction.maxPerEntryMinor", label: "int minor", value: 5000, valid: true },
  // currency.* / format.*
  { key: "currency.code", label: "EGP", value: "EGP", valid: true },
  { key: "currency.code", label: "lowercase rejected", value: "egp", valid: false },
  { key: "currency.code", label: "two letters rejected", value: "EG", valid: false },
  { key: "currency.minorUnitScale", label: "int", value: 2, valid: true },
  { key: "currency.minorUnitScale", label: "string rejected", value: "2", valid: false },
  { key: "format.digitStyle", label: "arabic_indic", value: "arabic_indic", valid: true },
  { key: "format.digitStyle", label: "unknown style", value: "arabic", valid: false },
  // branding.*
  { key: "branding.companyName", label: "arabic name", value: "شرق", valid: true },
  { key: "branding.companyName", label: "61 chars rejected", value: "ش".repeat(61), valid: false },
  { key: "branding.logoUrl", label: "https url", value: "https://example.com/logo.png", valid: true },
  { key: "branding.logoUrl", label: "not a url rejected", value: "not-a-url", valid: false },
  // export.* — header length, column subset order, filename tokens
  { key: "export.headerText", label: "200 chars allowed", value: "أ".repeat(200), valid: true },
  { key: "export.headerText", label: "201 chars rejected", value: "أ".repeat(201), valid: false },
  { key: "export.columns", label: "subset allowed", value: ["name", "total"], valid: true },
  { key: "export.columns", label: "unknown column rejected", value: ["name", "bogus"], valid: false },
  { key: "export.columns", label: "duplicate column rejected", value: ["name", "name"], valid: false },
  { key: "export.filenamePattern", label: "default tokens", value: "sharq-{team}-{from}-{to}.xlsx", valid: true },
  { key: "export.filenamePattern", label: "missing token rejected", value: "sharq-{team}.xlsx", valid: false },
  // calendar.*
  { key: "calendar.weeklyOffDays", label: "friday array", value: ["fri"], valid: true },
  { key: "calendar.weeklyOffDays", label: "full name rejected", value: ["friday"], valid: false },
  { key: "calendar.paydayHolidayPolicy", label: "later", value: "later", valid: true },
  { key: "calendar.paydayHolidayPolicy", label: "next rejected", value: "next", valid: false },
  // security.*
  { key: "security.sessionIdleMinutes", label: "5 allowed", value: 5, valid: true },
  { key: "security.sessionIdleMinutes", label: "1440 allowed", value: 1440, valid: true },
  { key: "security.sessionIdleMinutes", label: "4 rejected", value: 4, valid: false },
  { key: "security.minPasswordLength", label: "64 allowed", value: 64, valid: true },
  { key: "security.minPasswordLength", label: "7 rejected", value: 7, valid: false },
];

describe("FR-SET-01 per-key schemas (SPEC §5.2 validation column)", () => {
  test("accepts and rejects exactly the §5.2 shapes", () => {
    for (const c of CASES) {
      const entry = SETTINGS_REGISTRY[c.key];
      expect(
        entry,
        `registry entry for ${c.key} must exist before schema cases run`,
      ).toBeDefined();
      const checked = Value.Check(entry.schema, c.value);
      expect(
        checked,
        `${c.key} [${c.label}] expected valid=${c.valid}, got ${checked}`,
      ).toBe(c.valid);
    }
  });
});
