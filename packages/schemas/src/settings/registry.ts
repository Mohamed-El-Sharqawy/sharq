import type { Static } from "@sinclair/typebox";
import { ATTENDANCE_SETTINGS } from "./keys.attendance";
import { PAYROLL_POLICY_SETTINGS } from "./keys.payroll-policy";
import { BRANDING_EXPORT_SETTINGS } from "./keys.branding-export";

// The typed settings registry — SPEC §5.1. Scalar settings only: the four
// multi-row concerns (pay_rates, reason_catalog, attendance_statuses,
// holidays) are dedicated tables and land with their owning phases.
export const SETTINGS_REGISTRY = {
  ...ATTENDANCE_SETTINGS,
  ...PAYROLL_POLICY_SETTINGS,
  ...BRANDING_EXPORT_SETTINGS,
} as const;

export type SettingKey = keyof typeof SETTINGS_REGISTRY;
export type SettingDefinitionOf<K extends SettingKey> =
  (typeof SETTINGS_REGISTRY)[K];
export type SettingValues = {
  [K in SettingKey]: Static<(typeof SETTINGS_REGISTRY)[K]["schema"]>;
};
export type PartialSettingValues = Partial<SettingValues>;

export function defaultSettingValues(): SettingValues {
  return Object.fromEntries(
    Object.values(SETTINGS_REGISTRY).map((e) => [e.key, e.seededDefault]),
  ) as SettingValues;
}
