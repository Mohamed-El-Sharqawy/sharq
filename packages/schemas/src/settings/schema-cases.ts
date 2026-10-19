import { expect } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { SETTINGS_REGISTRY, type SettingDefinition } from "../index";

// Shared runner for per-key schema accept/reject tables (TESTING §6.2).
// Tuple form keeps prettier from wrapping each case across six lines.
export type SchemaCase = [
  key: string,
  label: string,
  value: unknown,
  valid: boolean,
];

export function runSchemaCases(cases: SchemaCase[]): void {
  const byKey = Object.fromEntries(Object.entries(SETTINGS_REGISTRY)) as Record<
    string,
    SettingDefinition
  >;
  for (const [key, label, value, valid] of cases) {
    const entry = byKey[key];
    expect(
      entry,
      `registry entry for ${key} must exist before schema cases run`,
    ).toBeDefined();
    const checked = Value.Check(entry!.schema, value);
    expect(
      checked,
      `${key} [${label}] expected valid=${valid}, got ${checked}`,
    ).toBe(valid);
  }
}
