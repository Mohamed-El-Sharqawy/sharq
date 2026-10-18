import type { Static, TSchema } from "@sinclair/typebox";

// Settings registry entry shape — SPEC §5.1: for each key a TypeBox schema,
// seeded default, scope, effective-dating mode, edit permission and an
// impact-preview descriptor (SPEC §5.5.6).

export type SettingScope = "company";
export type SettingDating = "immediate" | "effective-dated";
export type SettingEditPermission = "admin";
export type SettingImpactKind = "future-periods" | "future-entries" | "none";

export type SettingDefinition<S extends TSchema = TSchema> = {
  readonly key: string;
  readonly schema: S;
  readonly seededDefault: Static<S>;
  readonly scope: SettingScope;
  readonly dating: SettingDating;
  readonly edit: SettingEditPermission;
  readonly impact: SettingImpactKind;
};

// Every §5.2 scalar key is company-scoped, immediate and admin-edited in v1 —
// baked here so a divergent key must pass an explicit override, not drift in.
export function defineSetting<S extends TSchema>(
  key: string,
  schema: S,
  seededDefault: Static<S>,
  impact: SettingImpactKind = "none",
): SettingDefinition<S> {
  return {
    key,
    schema,
    seededDefault,
    scope: "company",
    dating: "immediate",
    edit: "admin",
    impact,
  };
}
