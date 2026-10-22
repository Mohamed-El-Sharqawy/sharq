// §5.5.6 change-safety validations for a settings PATCH, split from the
// write orchestrator (§9.3): registry schema check, the EC-52 scale
// immutability guard and FR-SET-08 cross-field validation merged over the
// CURRENT resolved values (not the defaults — a partial merge must meet
// the other side where it stands today).
import { Value } from "@sinclair/typebox/value";
import {
  SETTINGS_REGISTRY,
  validateSettingsCrossField,
  type SettingKey,
} from "@sharq/schemas";
import type { ResolvedSettings } from "./results";

export type SettingValidationFailure =
  | { kind: "schema"; issues: { path: string; message: string }[] }
  | { kind: "immutable-scale" }
  | { kind: "cross-field"; issues: { key: string; code: string }[] };

/** Runs every value-level guard in §5.5.6 order; null = safe to proceed. */
export function validateSettingValue(
  key: string,
  value: unknown,
  resolved: ResolvedSettings,
  attendanceExists: boolean,
): SettingValidationFailure | null {
  const def = SETTINGS_REGISTRY[key as SettingKey];
  if (!def || !Value.Check(def.schema, value)) {
    return {
      kind: "schema",
      issues: def
        ? [...Value.Errors(def.schema, value)].map((e) => ({
            path: String(e.path),
            message: e.message,
          }))
        : [],
    };
  }
  if (
    key === "currency.minorUnitScale" &&
    attendanceExists &&
    value !== resolved.values["currency.minorUnitScale"]
  ) {
    return { kind: "immutable-scale" };
  }
  const issues = validateSettingsCrossField({
    ...resolved.values,
    [key]: value,
  });
  if (issues.length > 0) return { kind: "cross-field", issues };
  return null;
}
