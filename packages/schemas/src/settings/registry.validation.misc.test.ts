import { describe, test } from "bun:test";
import { runSchemaCases, type SchemaCase } from "./schema-cases";

const CASES: SchemaCase[] = [
  ["currency.code", "EGP", "EGP", true],
  ["currency.code", "lowercase rejected", "egp", false],
  ["currency.code", "two letters rejected", "EG", false],
  ["currency.minorUnitScale", "int 2", 2, true],
  ["currency.minorUnitScale", "string rejected", "2", false],
  ["currency.minorUnitScale", "below 2 rejected", 1, false],
  ["currency.minorUnitScale", "above 4 rejected", 5, false],
  ["format.digitStyle", "arabic_indic", "arabic_indic", true],
  ["format.digitStyle", "unknown style", "arabic", false],
  ["branding.companyName", "arabic name", "شرق", true],
  ["branding.companyName", "61 chars rejected", "ش".repeat(61), false],
  ["branding.logoUrl", "https url", "https://example.com/logo.png", true],
  ["branding.logoUrl", "null allowed", null, true],
  ["branding.logoUrl", "not a url rejected", "not-a-url", false],
  ["export.headerText", "200 chars allowed", "أ".repeat(200), true],
  ["export.headerText", "201 chars rejected", "أ".repeat(201), false],
  ["export.columns", "subset allowed", ["name", "total"], true],
  ["export.columns", "unknown column rejected", ["name", "bogus"], false],
  ["export.columns", "duplicate column rejected", ["name", "name"], false],
  [
    "export.filenamePattern",
    "default tokens",
    "sharq-{team}-{from}-{to}.xlsx",
    true,
  ],
  [
    "export.filenamePattern",
    "missing token rejected",
    "sharq-{team}.xlsx",
    false,
  ],
  ["security.sessionIdleMinutes", "5 allowed", 5, true],
  ["security.sessionIdleMinutes", "1440 allowed", 1440, true],
  ["security.sessionIdleMinutes", "4 rejected", 4, false],
  ["security.minPasswordLength", "8 allowed", 8, true],
  ["security.minPasswordLength", "64 allowed", 64, true],
  ["security.minPasswordLength", "7 rejected", 7, false],
];

describe("FR-SET-01 currency/format/branding/export/security schemas (SPEC §5.2)", () => {
  test("accepts and rejects exactly the §5.2 shapes", () => {
    runSchemaCases(CASES);
  });
});
