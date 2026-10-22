// SPEC §10.1 — attendance_statuses repository (FR-SET-05). 23505 (code
// unique) surfaces as "DUPLICATE"; version misses as "VERSION_CONFLICT".
import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import { pgErrorInfo } from "../../lib/pg";
import type { CatalogsRepo, StatusRecord } from "./types";

type Db = PostgresJsDatabase<typeof schema>;
type StatusRow = typeof schema.attendanceStatuses.$inferSelect;

/** The status half of CatalogsRepo — catalogs-repo.ts spreads the two;
 * the bundle's type is what pins these method shapes. */
export function createDrizzleStatusesRepo(db: Db) {
  return {
    listStatuses: () => listStatuses(db),
    findStatus: (id: string) => findStatus(db, id),
    insertStatus: (input: Parameters<CatalogsRepo["insertStatus"]>[0]) =>
      insertStatus(db, input),
    updateStatus: (
      id: string,
      patch: Parameters<CatalogsRepo["updateStatus"]>[1],
      expectedVersion: number,
    ) => updateStatus(db, { id, patch, expectedVersion }),
  };
}

function toStatus(row: StatusRow): StatusRecord {
  return {
    id: row.id,
    code: row.code,
    nameAr: row.nameAr,
    carriesPay: row.carriesPay,
    isSystem: row.isSystem,
    isActive: row.isActive,
    version: row.version,
  };
}

async function listStatuses(db: Db): Promise<StatusRecord[]> {
  const rows = await db
    .select()
    .from(schema.attendanceStatuses)
    .orderBy(asc(schema.attendanceStatuses.code));
  return rows.map(toStatus);
}

async function findStatus(db: Db, id: string) {
  const rows = await db
    .select()
    .from(schema.attendanceStatuses)
    .where(eq(schema.attendanceStatuses.id, id))
    .limit(1);
  const row = rows[0];
  return row ? toStatus(row) : undefined;
}

async function insertStatus(
  db: Db,
  input: Parameters<CatalogsRepo["insertStatus"]>[0],
): Promise<StatusRecord | "DUPLICATE"> {
  try {
    const rows = await db
      .insert(schema.attendanceStatuses)
      .values({
        code: input.code,
        nameAr: input.nameAr,
        carriesPay: input.carriesPay,
        isSystem: false, // only the §5.6 seeds are system rows
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("status insert returned no row");
    return toStatus(row);
  } catch (error) {
    if (pgErrorInfo(error).code === "23505") return "DUPLICATE";
    throw error;
  }
}

async function updateStatus(
  db: Db,
  args: {
    id: string;
    patch: { nameAr?: string; carriesPay?: boolean; isActive?: boolean };
    expectedVersion: number;
  },
): Promise<StatusRecord | "VERSION_CONFLICT"> {
  const rows = await db
    .update(schema.attendanceStatuses)
    .set({
      nameAr: args.patch.nameAr,
      carriesPay: args.patch.carriesPay,
      isActive: args.patch.isActive,
      version: args.expectedVersion + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.attendanceStatuses.id, args.id),
        eq(schema.attendanceStatuses.version, args.expectedVersion),
      ),
    )
    .returning();
  const row = rows[0];
  return row ? toStatus(row) : "VERSION_CONFLICT";
}
