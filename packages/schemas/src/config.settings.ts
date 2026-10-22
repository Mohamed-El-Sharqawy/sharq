// SPEC §10.3/§10.6 — settings wire schemas (FR-SET-01/02, EC-48/52/53).
// The resolved-values schema is DERIVED from the registry (§10.3 one
// source): adding a §5.2 key extends this response automatically, and the
// deferred contract tests validate the wire against the same per-key
// schemas the server re-validates with.
import { type Static, Type } from "@sinclair/typebox";
import { IsoDate } from "./teams";
import { SETTINGS_REGISTRY, type SettingKey } from "./settings/registry";

/** PATCH /api/settings/:key — §10.6 verbatim. `value` is Unknown on the
 * wire (one route serves every key); the service re-validates it against
 * the registry schema for :key and answers 422 VALIDATION_FAILED with the
 * TypeBox issues (§10.3 server revalidation). */
export const PatchSettingBody = Type.Object(
  {
    value: Type.Unknown(),
    validFrom: Type.Optional(IsoDate),
    note: Type.Optional(Type.String({ maxLength: 500 })),
    version: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);
export type PatchSettingBody = Static<typeof PatchSettingBody>;

/** The per-key value schemas as one closed object — the cast mirrors
 * literalsOf (keys.payroll-policy.ts): it preserves each key's own schema
 * so Static<typeof SettingValuesSchema> === SettingValues. */
const SETTING_VALUE_PROPS = Object.fromEntries(
  (Object.keys(SETTINGS_REGISTRY) as SettingKey[]).map((k) => [
    k,
    SETTINGS_REGISTRY[k].schema,
  ]),
) as { [K in SettingKey]: (typeof SETTINGS_REGISTRY)[K]["schema"] };

export const SettingValuesSchema = Type.Object(SETTING_VALUE_PROPS, {
  additionalProperties: false,
});
export type SettingValuesSchema = Static<typeof SettingValuesSchema>;

/** Per-key concurrency token (EC-53). 0 = the registry seed is in effect
 * (no settings row yet); the first PATCH inserts row version 1. */
export const SettingsVersionsSchema = Type.Record(
  Type.String(),
  Type.Integer({ minimum: 0 }),
);

/** GET /api/settings — resolved settings + version (§10.6 SET-01). */
export const SettingsResponseBody = Type.Object(
  {
    values: SettingValuesSchema,
    versions: SettingsVersionsSchema,
  },
  { additionalProperties: false },
);
export type SettingsResponseBody = Static<typeof SettingsResponseBody>;

/** POST /api/settings/impact — pre-save preview (§10.6 SET-02, §5.5.6). */
export const SettingImpactBody = Type.Object(
  {
    key: Type.String({ minLength: 1 }),
    value: Type.Unknown(),
    validFrom: Type.Optional(IsoDate),
  },
  { additionalProperties: false },
);
export type SettingImpactBody = Static<typeof SettingImpactBody>;

export const SettingImpactKindSchema = Type.Union([
  Type.Literal("future-periods"),
  Type.Literal("future-entries"),
  Type.Literal("none"),
]);

/** Affected employees (live memberships at the date) +, for bounds keys,
 * the count of entries dated on/after the change that would violate the
 * new bounds — past entries are exempt (snapshotted, §5.5.6). */
export const SettingImpactResponse = Type.Object(
  {
    key: Type.String(),
    kind: SettingImpactKindSchema,
    validFrom: IsoDate,
    affectedEmployees: Type.Integer({ minimum: 0 }),
    futureViolatingEntries: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);
export type SettingImpactResponse = Static<typeof SettingImpactResponse>;

/** PATCH response — the written row (the client re-bases its cache on it). */
export const SettingRowResponse = Type.Object(
  {
    key: Type.String(),
    value: Type.Unknown(),
    validFrom: IsoDate,
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type SettingRowResponse = Static<typeof SettingRowResponse>;
