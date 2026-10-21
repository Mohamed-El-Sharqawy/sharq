// SPEC §10.1 — teams repository: drizzle queries only. Team rows have no
// deleted_at (the merged §7 schema uses is_active instead), so reads filter
// nothing. Memberships live in membership-repository.ts. Query bodies stay
// at module level; factories only bind the db (ESLint counts closures).
import { and, asc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import type { AdminTeam, TeamsRepo } from "./service";

type Db = PostgresJsDatabase<typeof schema>;
export type TeamRow = typeof schema.teams.$inferSelect;

export function createDrizzleTeamsRepo(db: Db): TeamsRepo {
  return {
    insertTeam: (input) => insertTeam(db, input),
    findTeam: (id) => findTeam(db, id),
    updateTeam: (id, patch, expectedVersion, now) =>
      updateTeam(db, { id, patch, expectedVersion, now }),
    listTeams: (query) => listTeams(db, query),
  };
}

async function insertTeam(
  db: Db,
  input: Parameters<TeamsRepo["insertTeam"]>[0],
): Promise<AdminTeam> {
  const rows = await db
    .insert(schema.teams)
    .values({ nameAr: input.nameAr, supervisorId: input.supervisorId })
    .returning();
  const row = rows[0];
  if (!row) throw new Error("team insert returned no row");
  return toTeam(row);
}

async function findTeam(db: Db, id: string) {
  const rows = await db
    .select()
    .from(schema.teams)
    .where(eq(schema.teams.id, id))
    .limit(1);
  const row = rows[0];
  return row ? toTeam(row) : undefined;
}

async function updateTeam(
  db: Db,
  args: {
    id: string;
    patch: Parameters<TeamsRepo["updateTeam"]>[1];
    expectedVersion: number;
    now: Date;
  },
): Promise<AdminTeam | "VERSION_CONFLICT"> {
  // drizzle skips undefined keys — absent patch fields stay untouched, an
  // explicit null supervisorId clears the column.
  const rows = await db
    .update(schema.teams)
    .set({
      nameAr: args.patch.nameAr,
      supervisorId: args.patch.supervisorId,
      version: args.expectedVersion + 1,
      updatedAt: args.now,
    })
    .where(
      and(
        eq(schema.teams.id, args.id),
        eq(schema.teams.version, args.expectedVersion),
      ),
    )
    .returning();
  const row = rows[0];
  return row ? toTeam(row) : "VERSION_CONFLICT";
}

async function listTeams(
  db: Db,
  query: Parameters<TeamsRepo["listTeams"]>[0],
): Promise<{ items: AdminTeam[]; total: number }> {
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(schema.teams)
      .orderBy(asc(schema.teams.nameAr))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ total: sql<number>`count(*)::int` }).from(schema.teams),
  ]);
  return { items: rows.map(toTeam), total: totals[0]?.total ?? 0 };
}

export function toTeam(row: TeamRow): AdminTeam {
  return {
    id: row.id,
    nameAr: row.nameAr,
    supervisorId: row.supervisorId,
    isActive: row.isActive,
    version: row.version,
  };
}
