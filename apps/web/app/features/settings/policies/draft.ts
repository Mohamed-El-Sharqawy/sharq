// apps/web — the policies screen's draft model (SPEC §11 policies row),
// split from logic.ts for the §9.2 gate. Nullable keys (auto-lock,
// max-per-entry) ride empty strings in the raw draft.
import type { SettingValues } from "@sharq/schemas";
import { minorToDecimal } from "@sharq/schemas";
import {
  POLICIES_ADMIN_UNLOCK,
  POLICIES_AUTO_LOCK,
  POLICIES_BLOCK_FUTURE,
  POLICIES_DAYS_BACK,
  POLICIES_EXCEED_DAY,
  POLICIES_EXCEED_WEEK,
  POLICIES_FLOOR_ZERO,
  POLICIES_MAX_PER_ENTRY,
  POLICIES_SUPERVISOR_LOCK,
  POLICIES_SUPERVISOR_PAID,
} from "@sharq/locales";
import { parseMoneyInput } from "../format";
import type { SettingDraft } from "../use-settings-save";

export type PoliciesDraft = {
  daysBack: string;
  blockFutureDays: boolean;
  autoLockDays: string; // "" = off (null)
  canSupervisorLock: boolean;
  canSupervisorMarkPaid: boolean;
  canAdminUnlockPaid: boolean;
  allowExceedDayPay: boolean;
  allowExceedWeeklyTotal: boolean;
  floorAtZero: boolean;
  maxPerEntry: string; // "" = unlimited (null)
};

export function draftFrom(values: SettingValues, scale: number): PoliciesDraft {
  const autoLock = values["attendance.editWindow.autoLockDaysAfterPeriodEnd"];
  const maxPerEntry = values["deduction.maxPerEntryMinor"];
  return {
    daysBack: String(values["attendance.editWindow.daysBack"]),
    blockFutureDays: values["attendance.editWindow.blockFutureDays"],
    autoLockDays: autoLock === null ? "" : String(autoLock),
    canSupervisorLock: values["policy.canSupervisorLock"],
    canSupervisorMarkPaid: values["policy.canSupervisorMarkPaid"],
    canAdminUnlockPaid: values["policy.canAdminUnlockPaid"],
    allowExceedDayPay: values["deduction.allowExceedDayPay"],
    allowExceedWeeklyTotal: values["deduction.allowExceedWeeklyTotal"],
    floorAtZero: values["deduction.floorAtZero"],
    maxPerEntry:
      maxPerEntry === null ? "" : String(minorToDecimal(maxPerEntry, scale)),
  };
}

/** Non-negative integer string → number, or null for the nullable keys. */
export function optionalInt(raw: string): number | null | "invalid" {
  if (raw === "") return null;
  return /^\d+$/.test(raw) ? Number(raw) : "invalid";
}

/** Max-per-entry input: "" = unlimited (null); a parse failure returns its
 * Arabic message (EC-31..34), otherwise the minor amount. */
export function parseMaxPerEntry(
  raw: string,
  scale: number,
): number | null | string {
  if (raw === "") return null;
  const parsed = parseMoneyInput(raw, scale);
  return parsed.ok ? parsed.minor : parsed.message;
}

/** The ten §5.2 keys the policies screen can change, one SettingDraft per
 * key (the label carries the row's Arabic name into the impact dialog). */
export function policiesDrafts(
  current: PoliciesDraft,
  daysBack: number | null,
  autoLockDays: number | null,
  maxPerEntry: number | null,
): SettingDraft[] {
  return [
    {
      key: "attendance.editWindow.daysBack",
      value: daysBack,
      label: POLICIES_DAYS_BACK,
    },
    {
      key: "attendance.editWindow.blockFutureDays",
      value: current.blockFutureDays,
      label: POLICIES_BLOCK_FUTURE,
    },
    {
      key: "attendance.editWindow.autoLockDaysAfterPeriodEnd",
      value: autoLockDays,
      label: POLICIES_AUTO_LOCK,
    },
    {
      key: "policy.canSupervisorLock",
      value: current.canSupervisorLock,
      label: POLICIES_SUPERVISOR_LOCK,
    },
    {
      key: "policy.canSupervisorMarkPaid",
      value: current.canSupervisorMarkPaid,
      label: POLICIES_SUPERVISOR_PAID,
    },
    {
      key: "policy.canAdminUnlockPaid",
      value: current.canAdminUnlockPaid,
      label: POLICIES_ADMIN_UNLOCK,
    },
    {
      key: "deduction.allowExceedDayPay",
      value: current.allowExceedDayPay,
      label: POLICIES_EXCEED_DAY,
    },
    {
      key: "deduction.allowExceedWeeklyTotal",
      value: current.allowExceedWeeklyTotal,
      label: POLICIES_EXCEED_WEEK,
    },
    {
      key: "deduction.floorAtZero",
      value: current.floorAtZero,
      label: POLICIES_FLOOR_ZERO,
    },
    {
      key: "deduction.maxPerEntryMinor",
      value: maxPerEntry,
      label: POLICIES_MAX_PER_ENTRY,
    },
  ];
}
