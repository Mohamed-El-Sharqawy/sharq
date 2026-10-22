// POST /api/settings/impact — the §5.5.6 pre-save preview (FR-SET-02):
// counts the employees the change reaches (live memberships at the date)
// and, for the entry-bounds keys, the entries dated on/after the change
// that would violate the new bounds. Past entries are exempt — they are
// snapshotted (§5.5.1). Pure read: no write, no audit.
import { Value } from "@sinclair/typebox/value";
import { SETTINGS_REGISTRY, type SettingKey } from "@sharq/schemas";
import { cairoToday } from "../../lib/cairo-today";
import { resolvedSettings, resolvedValue } from "./resolved-settings";
import type { ConfigDeps } from "./update-setting";
import type { ImpactInput, ImpactResult } from "./results";

export async function previewSetting(
  deps: ConfigDeps,
  input: ImpactInput,
  now: Date,
): Promise<ImpactResult> {
  const def = SETTINGS_REGISTRY[input.key as SettingKey];
  if (!def) return { ok: false, code: "NOT_FOUND" };
  if (!Value.Check(def.schema, input.value)) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      field: input.key,
      issues: [...Value.Errors(def.schema, input.value)].map((e) => ({
        path: String(e.path),
        message: e.message,
      })),
    };
  }
  const validFrom = input.validFrom ?? cairoToday(now);
  const kind = def.impact;
  return {
    ok: true,
    impact: {
      key: input.key,
      kind,
      validFrom,
      affectedEmployees:
        kind === "none"
          ? 0
          : await deps.repo.guards.countEmployeesLiveAt(validFrom),
      futureViolatingEntries: await countViolatingEntries(
        deps,
        input,
        validFrom,
      ),
    },
  };
}

/** Bounds preview (§5.5.6): the OTHER bound comes from the current
 * resolved value, so a one-sided edit previews against where the rule
 * stands today. Only the two entry-bounds keys count — quick picks are
 * optional chips, not constraints. */
async function countViolatingEntries(
  deps: ConfigDeps,
  input: ImpactInput,
  validFrom: string,
): Promise<number> {
  const key = input.key;
  if (
    key !== "attendance.amount.minMinor" &&
    key !== "attendance.amount.maxMinor"
  )
    return 0;
  const resolved = await resolvedSettings(deps.repo.settings);
  const min =
    key === "attendance.amount.minMinor"
      ? input.value
      : resolvedValue(resolved, "attendance.amount.minMinor");
  const max =
    key === "attendance.amount.maxMinor"
      ? input.value
      : resolvedValue(resolved, "attendance.amount.maxMinor");
  return deps.repo.guards.countFutureViolatingEntries(
    validFrom,
    min as number,
    max as number,
  );
}
