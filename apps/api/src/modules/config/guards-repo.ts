// SPEC §10.1 — the §5.5.6 change-safety lookups (period-state guard,
// EC-52 attendance probe, impact counts) + scope-target existence checks.
// Date comparisons are inclusive day-label math (2026-10-19 decision).
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import type { ConfigGuardsRepo } from "./types";

type Db = PostgresJsDatabase<typeof schema>;

export function createDrizzleConfigGuardsRepo(db: Db): ConfigGuardsRepo {
  return {
    strictestPeriodStateCovering: (date) => strictestState(db, date),
    hasAnyAttendance: () => hasAnyAttendance(db),
    countFutureViolatingEntries: (validFrom, minMinor, maxMinor) =>
      countViolating(db, { validFrom, minMinor, maxMinor }),
    countEmployeesLiveAt: (date) => countEmployeesLiveAt(db, date),
    teamExists: (id) => teamExists(db, id),
    userExists: (id) => userExists(db, id),
  };
}

const STRICTNESS = { open: 0, locked: 1, paid: 2 } as const;

/** FR-SET-09: the strictest state covering the date across ALL teams (a
 * company-scope change must not rewrite what any locked week resolved). */
async function strictestState(db: Db, date: string) {
  const rows = await db
    .select({ state: schema.payPeriods.state })
    .from(schema.payPeriods)
    .where(
      and(
        lte(schema.payPeriods.startDate, date),
        gte(schema.payPeriods.endDate, date),
      ),
    );
  let worst: "open" | "locked" | "paid" | undefined;
  for (const row of rows) {
    if (worst === undefined || STRICTNESS[row.state] > STRICTNESS[worst])
      worst = row.state;
  }
  return worst;
}

/** EC-52 counts soft-deleted entries too — their integers were written
 * under the current scale; the scale corrupted them just the same. */
async function hasAnyAttendance(db: Db): Promise<boolean> {
  const rows = await db
    .select({ one: sql<number>`1` })
    .from(schema.attendanceEntries)
    .limit(1);
  return rows.length > 0;
}

async function countViolating(
  db: Db,
  args: { validFrom: string; minMinor: number; maxMinor: number },
): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.attendanceEntries)
    .where(
      and(
        isNull(schema.attendanceEntries.deletedAt),
        gte(schema.attendanceEntries.entryDate, args.validFrom),
        sql`(${schema.attendanceEntries.amountMinor} < ${args.minMinor} or ${schema.attendanceEntries.amountMinor} > ${args.maxMinor})`,
      ),
    );
  return rows[0]?.total ?? 0;
}

/** §5.5.6 affected-employee count: live membership covering the date
 * (inclusive valid_to) on an active, non-deleted employee account. */
async function countEmployeesLiveAt(db: Db, date: string): Promise<number> {
  const rows = await db
    .select({
      total: sql<number>`count(distinct ${schema.teamMemberships.userId})::int`,
    })
    .from(schema.teamMemberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.teamMemberships.userId))
    .where(
      and(
        eq(schema.users.role, "employee"),
        eq(schema.users.isActive, true),
        isNull(schema.users.deletedAt),
        lte(schema.teamMemberships.validFrom, date),
        or(
          isNull(schema.teamMemberships.validTo),
          gte(schema.teamMemberships.validTo, date),
        ),
      ),
    );
  return rows[0]?.total ?? 0;
}

async function teamExists(db: Db, id: string): Promise<boolean> {
  // Teams have no deleted_at (§7 uses is_active) — existence is the row.
  const rows = await db
    .select({ one: sql<number>`1` })
    .from(schema.teams)
    .where(eq(schema.teams.id, id))
    .limit(1);
  return rows.length > 0;
}

async function userExists(db: Db, id: string): Promise<boolean> {
  // A soft-deleted user is not a rate target (EC-58 keeps history, not
  // writability).
  const rows = await db
    .select({ one: sql<number>`1` })
    .from(schema.users)
    .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
    .limit(1);
  return rows.length > 0;
}
