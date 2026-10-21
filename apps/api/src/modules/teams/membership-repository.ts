// SPEC §10.1 — memberships repository: drizzle queries only, team-scoped
// by construction (findMembership takes an explicit teamId). The ops run
// over a db-or-transaction handle; tx() gives the FR-ADM-05 transfer bundle
// its transaction. Overlap (23P01, the §7 exclusion) maps to "OVERLAP" and
// version misses to "VERSION_CONFLICT" — designed outcomes, never 500s.
import { type ExtractTablesWithRelations, and, asc, eq } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import {
  type PostgresJsDatabase,
  type PostgresJsQueryResultHKT,
} from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import { pgErrorInfo } from "../../lib/pg";
import type { Membership, MembershipsRepo, MembershipsTx } from "./service";

type Db = PostgresJsDatabase<typeof schema>;
type Tx = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
type DbOrTx = Db | Tx;
type MembershipRow = typeof schema.teamMemberships.$inferSelect;
type EndResult = Awaited<ReturnType<MembershipsTx["endMembership"]>>;
type InsertResult = Awaited<ReturnType<MembershipsTx["insertMembership"]>>;

export function createDrizzleMembershipsRepo(db: Db): MembershipsRepo {
  return {
    ...membershipsOps(db),
    tx: (fn) => db.transaction((tx) => fn(membershipsOps(tx))),
  };
}

function membershipsOps(db: DbOrTx): MembershipsTx {
  return {
    findMembership: (teamId, membershipId) =>
      findMembership(db, teamId, membershipId),
    listByUser: (userId) => listByUser(db, userId),
    endMembership: (id, validTo, expectedVersion) =>
      endMembership(db, id, validTo, expectedVersion),
    insertMembership: (input) => insertMembership(db, input),
  };
}

async function findMembership(
  db: DbOrTx,
  teamId: string,
  membershipId: string,
) {
  const rows = await db
    .select()
    .from(schema.teamMemberships)
    .where(
      and(
        eq(schema.teamMemberships.id, membershipId),
        eq(schema.teamMemberships.teamId, teamId),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? toMembership(row) : undefined;
}

async function listByUser(db: DbOrTx, userId: string) {
  const rows = await db
    .select()
    .from(schema.teamMemberships)
    .where(eq(schema.teamMemberships.userId, userId))
    .orderBy(asc(schema.teamMemberships.validFrom));
  return rows.map(toMembership);
}

async function endMembership(
  db: DbOrTx,
  id: string,
  validTo: string | null,
  expectedVersion: number,
): Promise<EndResult> {
  try {
    const rows = await db
      .update(schema.teamMemberships)
      .set({ validTo, version: expectedVersion + 1 })
      .where(
        and(
          eq(schema.teamMemberships.id, id),
          eq(schema.teamMemberships.version, expectedVersion),
        ),
      )
      .returning();
    const row = rows[0];
    return row ? toMembership(row) : "VERSION_CONFLICT";
  } catch (error) {
    if (isOverlap(error)) return "OVERLAP";
    throw error;
  }
}

async function insertMembership(
  db: DbOrTx,
  input: Parameters<MembershipsTx["insertMembership"]>[0],
): Promise<InsertResult> {
  try {
    const rows = await db
      .insert(schema.teamMemberships)
      .values(input)
      .returning();
    const row = rows[0];
    if (!row) throw new Error("membership insert returned no row");
    return toMembership(row);
  } catch (error) {
    if (isOverlap(error)) return "OVERLAP";
    throw error;
  }
}

/** EC-08 — the membership exclusion constraint (exclusion_violation). */
function isOverlap(error: unknown): boolean {
  return pgErrorInfo(error).code === "23P01";
}

function toMembership(row: MembershipRow): Membership {
  return {
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    validFrom: row.validFrom,
    validTo: row.validTo,
    version: row.version,
  };
}
