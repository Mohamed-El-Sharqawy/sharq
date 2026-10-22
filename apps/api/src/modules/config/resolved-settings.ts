// The read half of the settings service (FR-SET-01, §10.6 GET /api/settings):
// resolved values at Cairo today + the per-key version tokens (EC-53).
// Resolution per key: the company row with the LATEST valid_from at-or-
// before today wins (§5.3 company level — team overrides are v1.1); no row
// → the registry seed. Values are never null-signals: a legally-null value
// travels inside its row (PROGRESS row-2 decision).
import {
  SETTINGS_REGISTRY,
  defaultSettingValues,
  type SettingValues,
} from "@sharq/schemas";
import { cairoToday } from "../../lib/cairo-today";
import type { SettingsRepo } from "./types";
import type { ResolvedSettings } from "./results";

type DatedRow = {
  id: string;
  key: string;
  value: unknown;
  validFrom: string;
  version: number;
};

/** `rows` must arrive ordered by (valid_from, created_at) — ties resolve to
 * the later-inserted row, both for the value and the version token. */
export function resolveRows(rows: DatedRow[], today: string): ResolvedSettings {
  const values = defaultSettingValues() as Record<string, unknown>;
  const versions: Record<string, number> = {};
  const latestRow: ResolvedSettings["latestRow"] = {};
  const winner = new Map<string, DatedRow>();
  for (const row of rows) {
    latestRow[row.key] = {
      id: row.id,
      value: row.value,
      validFrom: row.validFrom,
      version: row.version,
    }; // last in order = the PATCH concurrency target
    if (row.validFrom <= today) {
      const prev = winner.get(row.key);
      if (!prev || row.validFrom >= prev.validFrom) winner.set(row.key, row);
    }
  }
  for (const key of Object.keys(SETTINGS_REGISTRY)) {
    versions[key] = latestRow[key]?.version ?? 0; // 0 = the seed is in effect
    const won = winner.get(key);
    if (won) values[key] = won.value;
  }
  return { values: values as SettingValues, versions, latestRow };
}

/** One repo read → the full resolved map (the GET body + the merge base
 * for cross-field validation and the deduction-max check). */
export async function resolvedSettings(
  settings: SettingsRepo,
  today: string = cairoToday(),
): Promise<ResolvedSettings> {
  return resolveRows(await settings.allCompanyRows(), today);
}

export function resolvedValue(
  resolved: ResolvedSettings,
  key: string,
): unknown {
  return (resolved.values as Record<string, unknown>)[key];
}
