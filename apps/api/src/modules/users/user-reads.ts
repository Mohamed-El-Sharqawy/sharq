// SPEC §10.1 — users repository (reads): the live-user lookup and the
// FR-ADM-06 paged search. Writes live in repository.ts; shared row
// plumbing in rows.ts.
import {
  and,
  asc,
  eq,
  exists,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import { liveUser, toUser } from "./rows";
import type { AdminUser, UsersRepo } from "./service";

type Db = PostgresJsDatabase<typeof schema>;

export async function findUser(db: Db, id: string) {
  const rows = await db
    .select()
    .from(schema.users)
    .where(and(liveUser, eq(schema.users.id, id)))
    .limit(1);
  const row = rows[0];
  return row ? toUser(row) : undefined;
}

export async function listUsers(
  db: Db,
  query: Parameters<UsersRepo["listUsers"]>[0],
): Promise<{ items: AdminUser[]; total: number }> {
  const conditions = [liveUser];
  if (query.q) {
    const needle = `%${query.q}%`;
    const matches = or(
      ilike(schema.users.displayNameAr, needle),
      ilike(schema.users.phone, needle),
    );
    if (matches) conditions.push(matches);
  }
  if (query.role) conditions.push(eq(schema.users.role, query.role));
  if (query.teamId) {
    conditions.push(memberOfTeam(db, query.teamId, query.today));
  }

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(schema.users)
      .where(and(...conditions))
      .orderBy(asc(schema.users.username))
      .limit(query.limit)
      .offset(query.offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(and(...conditions)),
  ]);
  return { items: rows.map(toUser), total: totals[0]?.total ?? 0 };
}

/** FR-ADM-06 team filter: a membership live on `today` — valid_from ≤
 * today ≤ valid_to (valid_to INCLUSIVE; FR-ADM-04: E is the last day). */
function memberOfTeam(db: Db, teamId: string, today: string) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(schema.teamMemberships)
      .where(
        and(
          eq(schema.teamMemberships.userId, schema.users.id),
          eq(schema.teamMemberships.teamId, teamId),
          lte(schema.teamMemberships.validFrom, today),
          or(
            isNull(schema.teamMemberships.validTo),
            gte(schema.teamMemberships.validTo, today),
          ),
        ),
      ),
  );
}
