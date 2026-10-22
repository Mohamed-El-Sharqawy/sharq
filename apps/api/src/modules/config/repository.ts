// SPEC §10.1 — the drizzle composition of the ConfigRepo bundle: one
// factory the app composition root (and the integration harness) injects
// as AppDeps.configRepo. All query bodies live in the per-concern files.
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import { createDrizzleCatalogsRepo } from "./catalogs-repo";
import { createDrizzleConfigGuardsRepo } from "./guards-repo";
import { createDrizzleHolidaysRepo } from "./holidays-repo";
import { createDrizzleRatesRepo } from "./rates-repo";
import { createDrizzleSettingsRepo } from "./settings-repo";
import type { ConfigRepo } from "./types";

type Db = PostgresJsDatabase<typeof schema>;

export function createDrizzleConfigRepo(db: Db): ConfigRepo {
  return {
    settings: createDrizzleSettingsRepo(db),
    rates: createDrizzleRatesRepo(db),
    catalogs: createDrizzleCatalogsRepo(db),
    holidays: createDrizzleHolidaysRepo(db),
    guards: createDrizzleConfigGuardsRepo(db),
  };
}
