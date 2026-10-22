// SPEC §10.1 — reason_catalog repository (FR-SET-04). No delete op exists
// (EC-46: catalogs deactivate, never delete).
import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import type { CatalogsRepo, ReasonRecord } from "./types";

type Db = PostgresJsDatabase<typeof schema>;
type ReasonRow = typeof schema.reasonCatalog.$inferSelect;

/** The reason half of CatalogsRepo — catalogs-repo.ts spreads the two;
 * the bundle's type is what pins these method shapes. */
export function createDrizzleReasonsRepo(db: Db) {
  return {
    listReasons: () => listReasons(db),
    findReason: (id: string) => findReason(db, id),
    insertReason: (input: Parameters<CatalogsRepo["insertReason"]>[0]) =>
      insertReason(db, input),
    updateReason: (
      id: string,
      patch: Parameters<CatalogsRepo["updateReason"]>[1],
      expectedVersion: number,
    ) => updateReason(db, { id, patch, expectedVersion }),
  };
}

function toReason(row: ReasonRow): ReasonRecord {
  return {
    id: row.id,
    kind: row.kind,
    nameAr: row.nameAr,
    defaultAmountMinor: row.defaultAmountMinor,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    version: row.version,
  };
}

async function listReasons(db: Db): Promise<ReasonRecord[]> {
  const rows = await db
    .select()
    .from(schema.reasonCatalog)
    .orderBy(
      asc(schema.reasonCatalog.kind),
      asc(schema.reasonCatalog.sortOrder),
    );
  return rows.map(toReason);
}

async function findReason(db: Db, id: string) {
  const rows = await db
    .select()
    .from(schema.reasonCatalog)
    .where(eq(schema.reasonCatalog.id, id))
    .limit(1);
  const row = rows[0];
  return row ? toReason(row) : undefined;
}

async function insertReason(
  db: Db,
  input: Parameters<CatalogsRepo["insertReason"]>[0],
): Promise<ReasonRecord> {
  const rows = await db
    .insert(schema.reasonCatalog)
    .values({
      kind: input.kind as ReasonRow["kind"],
      nameAr: input.nameAr,
      defaultAmountMinor: input.defaultAmountMinor,
      sortOrder: 0,
    })
    .returning();
  const row = rows[0];
  if (!row) throw new Error("reason insert returned no row");
  return toReason(row);
}

async function updateReason(
  db: Db,
  args: {
    id: string;
    patch: {
      nameAr?: string;
      defaultAmountMinor?: number | null;
      isActive?: boolean;
    };
    expectedVersion: number;
  },
): Promise<ReasonRecord | "VERSION_CONFLICT"> {
  const rows = await db
    .update(schema.reasonCatalog)
    .set({
      nameAr: args.patch.nameAr,
      defaultAmountMinor: args.patch.defaultAmountMinor,
      isActive: args.patch.isActive,
      version: args.expectedVersion + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.reasonCatalog.id, args.id),
        eq(schema.reasonCatalog.version, args.expectedVersion),
      ),
    )
    .returning();
  const row = rows[0];
  return row ? toReason(row) : "VERSION_CONFLICT";
}
