import { Type } from "@sinclair/typebox";
import { defineSetting } from "./types";

// SPEC §5.2 — currency.* / format.* / branding.* / export.* / security.*
// scalar keys. security.* keys, seeds and enforcement land in v1 (UI in v1.1).
const EXPORT_COLUMNS = [
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
] as const;

// Filename pattern must reference every filename token (SPEC §5.2).
const ALL_FILENAME_TOKENS =
  "^(?=[\\s\\S]*\\{team\\})(?=[\\s\\S]*\\{from\\})(?=[\\s\\S]*\\{to\\})[\\s\\S]+$";

export const BRANDING_EXPORT_SETTINGS = {
  "currency.code": defineSetting(
    "currency.code",
    Type.String({ pattern: "^[A-Z]{3}$" }),
    "EGP",
  ),
  "currency.minorUnitScale": defineSetting(
    "currency.minorUnitScale",
    Type.Integer({ minimum: 2, maximum: 4 }),
    2,
  ),
  "format.digitStyle": defineSetting(
    "format.digitStyle",
    Type.Union([Type.Literal("western"), Type.Literal("arabic_indic")]),
    "western",
  ),
  "branding.companyName": defineSetting(
    "branding.companyName",
    Type.String({ minLength: 1, maxLength: 60 }),
    "شرق",
  ),
  "branding.logoUrl": defineSetting(
    "branding.logoUrl",
    Type.Union([Type.String({ pattern: "^https?://\\S+$" }), Type.Null()]),
    null,
  ),
  "export.headerText": defineSetting(
    "export.headerText",
    Type.String({ maxLength: 200 }),
    "شرق — كشف مرتبات {team} — أسبوع {period}",
  ),
  "export.columns": defineSetting(
    "export.columns",
    Type.Array(Type.Union(EXPORT_COLUMNS.map((c) => Type.Literal(c))), {
      minItems: 1,
      uniqueItems: true,
    }),
    [...EXPORT_COLUMNS],
  ),
  "export.filenamePattern": defineSetting(
    "export.filenamePattern",
    Type.String({ pattern: ALL_FILENAME_TOKENS }),
    "sharq-{team}-{from}-{to}.xlsx",
  ),
  "security.sessionIdleMinutes": defineSetting(
    "security.sessionIdleMinutes",
    Type.Integer({ minimum: 5, maximum: 1440 }),
    240,
  ),
  "security.minPasswordLength": defineSetting(
    "security.minPasswordLength",
    Type.Integer({ minimum: 8, maximum: 64 }),
    8,
  ),
} as const;
