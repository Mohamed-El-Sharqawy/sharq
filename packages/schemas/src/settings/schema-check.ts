// §10.3 — the registry schema check as ONE shared function: the server
// re-validates every PATCH (apps/api setting-validation.ts) and the web
// screens pre-check their drafts with the very same function before any
// round trip. Lives here (not in the consumers) so the rule has one home.
import { Value } from "@sinclair/typebox/value";
import {
  SETTINGS_REGISTRY,
  type SettingKey,
  type SettingValues,
} from "./registry";

/** True when `value` satisfies the §5.2 registry schema for `key`. */
export function settingSchemaValid<K extends SettingKey>(
  key: K,
  value: unknown,
): value is SettingValues[K] {
  const definition = SETTINGS_REGISTRY[key];
  return definition !== undefined && Value.Check(definition.schema, value);
}
