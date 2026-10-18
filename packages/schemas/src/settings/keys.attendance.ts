import { Type } from "@sinclair/typebox";
import { defineSetting } from "./types";

// SPEC §5.2 — attendance.* scalar keys. Money in integer minor units.
export const ATTENDANCE_SETTINGS = {
  "attendance.amount.minMinor": defineSetting(
    "attendance.amount.minMinor",
    Type.Integer({ minimum: 0 }),
    0,
    "future-entries",
  ),
  "attendance.amount.maxMinor": defineSetting(
    "attendance.amount.maxMinor",
    Type.Integer(),
    500000,
    "future-entries",
  ),
  "attendance.quickPicks": defineSetting(
    "attendance.quickPicks",
    Type.Array(Type.Integer(), { maxItems: 8, uniqueItems: true }),
    [40000, 60000, 80000],
    "future-entries",
  ),
  "attendance.entryMode": defineSetting(
    "attendance.entryMode",
    Type.Union([Type.Literal("free"), Type.Literal("quick_picks_only")]),
    "free",
    "future-entries",
  ),
  "attendance.reason.requiredOnOverride": defineSetting(
    "attendance.reason.requiredOnOverride",
    Type.Boolean(),
    true,
  ),
  "attendance.reason.requiredOnDeduction": defineSetting(
    "attendance.reason.requiredOnDeduction",
    Type.Boolean(),
    true,
  ),
  "attendance.reason.minLength": defineSetting(
    "attendance.reason.minLength",
    Type.Integer({ minimum: 2, maximum: 20 }),
    3,
  ),
  "attendance.reason.allowFreeText": defineSetting(
    "attendance.reason.allowFreeText",
    Type.Boolean(),
    true,
  ),
  "attendance.editWindow.daysBack": defineSetting(
    "attendance.editWindow.daysBack",
    Type.Integer({ minimum: 0, maximum: 90 }),
    7,
  ),
  "attendance.editWindow.blockFutureDays": defineSetting(
    "attendance.editWindow.blockFutureDays",
    Type.Boolean(),
    true,
  ),
  "attendance.editWindow.autoLockDaysAfterPeriodEnd": defineSetting(
    "attendance.editWindow.autoLockDaysAfterPeriodEnd",
    Type.Union([Type.Integer({ minimum: 1, maximum: 30 }), Type.Null()]),
    null,
    "future-periods",
  ),
} as const;
