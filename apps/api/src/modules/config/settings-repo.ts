// SPEC §10.1 — settings-row repository: drizzle queries only (query bodies
// at module level, factories only bind the db — the teams-repo pattern).
import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import { pgErrorInfo } from "../../lib/pg";
import type { SettingRecord, SettingsRepo } from "./types";

type Db = PostgresJsDatabase<typeof schema>;
type Row = typeof schema.settings.$inferSelect;

/** §7: settings rows are company-scoped in v1 (team_id null). Order matters
 * — resolveRows consumes (valid_from, created_at) to break ties. */
export function createDrizzleSettingsRepo(db: Db): SettingsRepo {
  return {
    allCompanyRows: () => allCompanyRows(db),
    latestRowForKey: (key) => latestRowForKey(db, key),
    insertRow: (input) => insertRow(db, input),
    updateRowValue: (id, value, expectedVersion, updatedBy) =>
      updateRowValue(db, { id, value, expectedVersion, updatedBy }),
  };
}

function toRecord(row: Row): SettingRecord {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    validFrom: row.validFrom,
    version: row.version,
    updatedBy: row.updatedBy,
  };
}

async function allCompanyRows(db: Db): Promise<SettingRecord[]> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.scopeType, "company"))
    .orderBy(asc(schema.settings.validFrom), asc(schema.settings.createdAt));
  return rows.map(toRecord);
}

async function latestRowForKey(
  db: Db,
  key: string,
): Promise<SettingRecord | undefined> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .orderBy(asc(schema.settings.validFrom), asc(schema.settings.createdAt));
  const row = rows.at(-1);
  return row ? toRecord(row) : undefined;
}

async function insertRow(
  db: Db,
  input: Parameters<SettingsRepo["insertRow"]>[0],
): Promise<SettingRecord | "ROW_RACE"> {
  try {
    const rows = await db
      .insert(schema.settings)
      .values({
        key: input.key,
        scopeType: "company",
        value: input.value,
        validFrom: input.validFrom,
        version: input.version,
        updatedBy: input.updatedBy,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("settings insert returned no row");
    return toRecord(row);
  } catch (error) {
    // §7 uniq(key, scope, team, valid_from): two admins racing the same
    // key+date is the EC-53 conflict in row form → "ROW_RACE".
    if (pgErrorInfo(error).code === "23505") return "ROW_RACE";
    throw error;
  }
}

async function updateRowValue(
  db: Db,
  args: {
    id: string;
    value: unknown;
    expectedVersion: number;
    updatedBy: string;
  },
): Promise<SettingRecord | "VERSION_CONFLICT"> {
  const rows = await db
    .update(schema.settings)
    .set({
      value: args.value,
      version: args.expectedVersion + 1,
      updatedBy: args.updatedBy,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.settings.id, args.id),
        eq(schema.settings.version, args.expectedVersion),
      ),
    )
    .returning();
  const row = rows[0];
  return row ? toRecord(row) : "VERSION_CONFLICT";
}
