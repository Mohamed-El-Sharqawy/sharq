// apps/web — draft→save helpers shared by the scalar settings screens
// (FR-SET-02/08): only changed keys save, values pre-check against the
// registry schema and the FR-SET-08 cross-field rules CLIENT-side with the
// same @sharq/schemas validators the server re-runs (§10.3 one source).
import {
  settingSchemaValid,
  validateSettingsCrossField,
  type CrossFieldIssueCode,
  type SettingKey,
  type SettingValues,
} from "@sharq/schemas";
import { CROSS_FIELD_MESSAGES } from "@sharq/locales";
import type { SettingDraft } from "./use-settings-save";

/** Only keys whose draft differs from the resolved value go to the saver. */
export function changedDrafts(
  drafts: SettingDraft[],
  values: SettingValues,
): SettingDraft[] {
  return drafts.filter(
    (draft) =>
      JSON.stringify(draft.value) !== JSON.stringify(values[draft.key]),
  );
}

/** Registry-schema pre-check with the key's Arabic label for context. */
export function schemaFailure(key: SettingKey, value: unknown): boolean {
  return !settingSchemaValid(key, value);
}

/** FR-SET-08 over the DRAFT merged onto the current resolved values —
 * never the defaults (§5.5.6: the other side is where it stands today).
 * Returns the first issue's Arabic message, or null when clean. */
export function crossFieldFailure(
  merged: Partial<SettingValues>,
): string | null {
  const issues = validateSettingsCrossField(merged);
  const first = issues[0]?.code as CrossFieldIssueCode | undefined;
  return first ? (CROSS_FIELD_MESSAGES[first] ?? null) : null;
}
