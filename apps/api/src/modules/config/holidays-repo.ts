// SPEC §10.1 — holidays repository (§7: id, date uniq, name_ar, created_by;
// no version column — add/remove only).
import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import { pgErrorInfo } from "../../lib/pg";
import type { HolidayRecord, HolidaysRepo } from "./types";

type Db = PostgresJsDatabase<typeof schema>;

export function createDrizzleHolidaysRepo(db: Db): HolidaysRepo {
  return {
    listHolidays: () => listHolidays(db),
    findHoliday: (id) => findHoliday(db, id),
    insertHoliday: (input) => insertHoliday(db, input),
    deleteHoliday: (id) => deleteHoliday(db, id),
  };
}

function toRecord(row: typeof schema.holidays.$inferSelect): HolidayRecord {
  return { id: row.id, date: row.date, nameAr: row.nameAr };
}

async function listHolidays(db: Db): Promise<HolidayRecord[]> {
  const rows = await db
    .select()
    .from(schema.holidays)
    .orderBy(asc(schema.holidays.date));
  return rows.map(toRecord);
}

async function findHoliday(db: Db, id: string) {
  const rows = await db
    .select()
    .from(schema.holidays)
    .where(eq(schema.holidays.id, id))
    .limit(1);
  const row = rows[0];
  return row ? toRecord(row) : undefined;
}

async function insertHoliday(
  db: Db,
  input: Parameters<HolidaysRepo["insertHoliday"]>[0],
): Promise<HolidayRecord | "DUPLICATE"> {
  try {
    const rows = await db
      .insert(schema.holidays)
      .values({
        date: input.date,
        nameAr: input.nameAr,
        createdBy: input.createdBy,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("holiday insert returned no row");
    return toRecord(row);
  } catch (error) {
    if (pgErrorInfo(error).code === "23505") return "DUPLICATE";
    throw error;
  }
}

/** Physical delete — §10.6 gives holidays the one DELETE in the config
 * domain (catalogs never delete, EC-46; holidays are pure calendar data
 * history references by value, not by fk). */
async function deleteHoliday(db: Db, id: string) {
  const rows = await db
    .delete(schema.holidays)
    .where(eq(schema.holidays.id, id))
    .returning();
  const row = rows[0];
  return row ? toRecord(row) : undefined;
}
