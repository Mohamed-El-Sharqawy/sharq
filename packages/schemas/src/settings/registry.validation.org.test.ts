import { describe, test } from "bun:test";
import { runSchemaCases, type SchemaCase } from "./schema-cases";

const CASES: SchemaCase[] = [
  ["payroll.weekStartDay", "each weekday code", "sun", true],
  ["payroll.weekStartDay", "full name rejected", "Saturday", false],
  ["payroll.payday", "thursday code", "thu", true],
  ["payroll.payday", "saturday outside enum", "sat", false],
  ["policy.canSupervisorMarkPaid", "boolean", true, true],
  ["deduction.allowExceedDayPay", "string rejected", "no", false],
  ["deduction.maxPerEntryMinor", "null = no cap", null, true],
  ["deduction.maxPerEntryMinor", "int minor", 5000, true],
  ["deduction.maxPerEntryMinor", "negative rejected", -1, false],
  ["calendar.weeklyOffDays", "friday array", ["fri"], true],
  ["calendar.weeklyOffDays", "full name rejected", ["friday"], false],
  ["calendar.weeklyOffDays", "duplicate days rejected", ["fri", "fri"], false],
  ["calendar.paydayHolidayPolicy", "later", "later", true],
  ["calendar.paydayHolidayPolicy", "next rejected", "next", false],
];

describe("FR-SET-01 payroll/policy/deduction/calendar schemas (SPEC §5.2)", () => {
  test("accepts and rejects exactly the §5.2 shapes", () => {
    runSchemaCases(CASES);
  });
});
