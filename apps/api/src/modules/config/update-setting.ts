// PATCH /api/settings/:key business rules (FR-SET-02/09/10, §5.5.6):
// validate → EC-53 version token → EC-52 scale immutability → FR-SET-08
// cross-field → FR-SET-09 period guard → write (update the same-day row or
// insert a new dated row) → audit. Immediate keys default validFrom to
// Cairo today; an explicitly-dated write is period-guarded, a default-
// today immediate write is not (period locks freeze DATA, not config).
import { SETTINGS_REGISTRY } from "@sharq/schemas";
import { cairoToday } from "../../lib/cairo-today";
import type { AuditPort } from "../auth/types";
import { guardDateWritable } from "./date-guards";
import { resolvedSettings, resolvedValue } from "./resolved-settings";
import {
  validateSettingValue,
  type SettingValidationFailure,
} from "./setting-validation";
import type {
  ResolvedSettings,
  SettingValuesConflict,
  UpdateSettingInput,
  UpdateSettingResult,
} from "./results";
import type { ConfigRepo, SettingRecord } from "./types";

export type ConfigDeps = { repo: ConfigRepo; audit: AuditPort };

export async function updateSetting(
  deps: ConfigDeps,
  input: UpdateSettingInput,
  now: Date,
): Promise<UpdateSettingResult> {
  if (!(input.key in SETTINGS_REGISTRY))
    return { ok: false, code: "NOT_FOUND" };
  const today = cairoToday(now);
  const resolved = await resolvedSettings(deps.repo.settings, today);
  const currentVersion = resolved.versions[input.key] ?? 0;
  if (input.version !== currentVersion) {
    return {
      ok: false,
      code: "CONFLICT_VERSION",
      current: conflictOf(input.key, resolved),
    };
  }
  const failure = validateSettingValue(
    input.key,
    input.value,
    resolved,
    await deps.repo.guards.hasAnyAttendance(),
  );
  if (failure) return validationFailure(input.key, failure);
  const date = input.validFrom ?? today;
  if (input.validFrom !== undefined && input.validFrom !== today) {
    const problem = await guardDateWritable(deps.repo.guards, date);
    if (problem) return { ok: false, code: problem };
  }
  return writeSetting(deps, input, resolved, date);
}

/** EC-53's "fresh value to the loser": the resolved value + its token. */
function conflictOf(
  key: string,
  resolved: ResolvedSettings,
): SettingValuesConflict {
  return {
    key,
    value: resolvedValue(resolved, key),
    validFrom: resolved.latestRow[key]?.validFrom ?? null,
    version: resolved.versions[key] ?? 0,
  };
}

/** The write half: same-day rows edit in place (§7 uniq key+date), other
 * dates insert a new dated row whose version continues the key's token
 * (seed 0 → first row 1, so a second seed-state PATCH is a 409). */
async function writeSetting(
  deps: ConfigDeps,
  input: UpdateSettingInput,
  resolved: ResolvedSettings,
  date: string,
): Promise<UpdateSettingResult> {
  const latest = resolved.latestRow[input.key];
  const repo = deps.repo.settings;
  const row =
    latest && latest.validFrom === date
      ? await repo.updateRowValue(
          latest.id,
          input.value,
          input.version,
          input.actorId,
        )
      : await repo.insertRow({
          key: input.key,
          value: input.value,
          validFrom: date,
          version: (resolved.versions[input.key] ?? 0) + 1,
          updatedBy: input.actorId,
        });
  if (row === "VERSION_CONFLICT" || row === "ROW_RACE") {
    return {
      ok: false,
      code: "CONFLICT_VERSION",
      current: conflictOf(input.key, resolved),
    };
  }
  await deps.audit.record({
    action: "settings.update",
    entityType: "setting",
    entityId: row.id,
    actorId: input.actorId,
    oldValue: latest ? { key: input.key, ...latest } : null,
    newValue: {
      key: input.key,
      value: row.value,
      validFrom: row.validFrom,
      version: row.version,
    },
    note: input.note ?? null,
  });
  return { ok: true, setting: row as SettingRecord };
}

function validationFailure(
  key: string,
  failure: SettingValidationFailure,
): UpdateSettingResult {
  if (failure.kind === "immutable-scale")
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      field: key,
      issues: [{ key, code: "IMMUTABLE_ONCE_ATTENDANCE_EXISTS" }],
    };
  if (failure.kind === "cross-field")
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      field: failure.issues[0]?.key ?? key,
      issues: failure.issues,
    };
  return {
    ok: false,
    code: "VALIDATION_FAILED",
    field: key,
    issues: failure.issues.map((i) => ({
      key: `${key}${i.path}`,
      code: i.message,
    })),
  };
}
