// SPEC §10.1 — the catalogs bundle: reason_catalog (reasons-repo.ts) +
// attendance_statuses (statuses-repo.ts) assembled into the one
// CatalogsRepo port. No delete op exists on either half (EC-46).
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import { createDrizzleReasonsRepo } from "./reasons-repo";
import { createDrizzleStatusesRepo } from "./statuses-repo";
import type { CatalogsRepo } from "./types";

type Db = PostgresJsDatabase<typeof schema>;

export function createDrizzleCatalogsRepo(db: Db): CatalogsRepo {
  return {
    ...createDrizzleReasonsRepo(db),
    ...createDrizzleStatusesRepo(db),
  };
}
