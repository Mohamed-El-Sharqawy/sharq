// SPEC §10.1 — auth repository: drizzle queries only. It maps table rows to
// the service-level types and keeps passwordHash inside this file (the
// service-level AuthUser deliberately omits it). Soft-deleted users resolve
// to nothing on both lookup paths, so a deleted account cannot log in and
// its live sessions stop resolving. Query bodies live at module level; the
// factory only binds the db (ESLint counts closures, §9.3).
import { and, eq, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import type { AuthRepo, AuthSession, AuthUserWithHash } from "./service";

type Db = PostgresJsDatabase<typeof schema>;

/** Soft-deleted users are gone for auth purposes (§7 soft delete). */
const liveUser = isNull(schema.users.deletedAt);

export function createDrizzleAuthRepo(db: Db): AuthRepo {
  return {
    findUserByIdentifier: (identifier) => findUserByIdentifier(db, identifier),
    insertSession: (input) => insertSession(db, input),
    findSessionByTokenHash: (tokenHash) =>
      findSessionByTokenHash(db, tokenHash),
    findUserById: (id) => findUserById(db, id),
    updatePassword: (id, passwordHash, now) =>
      updatePassword(db, id, passwordHash, now),
    isTeamSupervisor: (userId, teamId) => isTeamSupervisor(db, userId, teamId),
    touchSession: (id, lastSeenAt, expiresAt) =>
      touchSession(db, id, lastSeenAt, expiresAt),
    revokeSession: (id, revokedAt) => revokeSession(db, id, revokedAt),
  };
}

async function findUserByIdentifier(db: Db, identifier: string) {
  const rows = await db
    .select()
    .from(schema.users)
    .where(
      and(
        liveUser,
        or(
          eq(schema.users.username, identifier),
          eq(schema.users.phone, identifier),
        ),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? toUserWithHash(row) : undefined;
}

async function insertSession(
  db: Db,
  input: Parameters<AuthRepo["insertSession"]>[0],
) {
  const rows = await db.insert(schema.sessions).values(input).returning();
  const row = rows[0];
  if (!row) throw new Error("session insert returned no row");
  return toSession(row);
}

async function findSessionByTokenHash(db: Db, tokenHash: string) {
  const rows = await db
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(
      schema.users,
      and(eq(schema.users.id, schema.sessions.userId), liveUser),
    )
    .where(eq(schema.sessions.tokenHash, tokenHash))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  return {
    session: toSession(row.session),
    user: toUserWithHash(row.user),
  };
}

async function findUserById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(schema.users)
    .where(and(liveUser, eq(schema.users.id, id)))
    .limit(1);
  const row = rows[0];
  return row ? toUserWithHash(row) : undefined;
}

/** FR-AUTH-05/07: swap the hash and clear must_change_password. */
async function updatePassword(
  db: Db,
  id: string,
  passwordHash: string,
  now: Date,
) {
  await db
    .update(schema.users)
    .set({ passwordHash, mustChangePassword: false, updatedAt: now })
    .where(and(liveUser, eq(schema.users.id, id)));
}

/** §10.2 teamScope: a live team whose supervisor_id is this user. */
async function isTeamSupervisor(db: Db, userId: string, teamId: string) {
  const rows = await db
    .select({ id: schema.teams.id })
    .from(schema.teams)
    .where(
      and(
        eq(schema.teams.supervisorId, userId),
        eq(schema.teams.id, teamId),
        eq(schema.teams.isActive, true),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function touchSession(
  db: Db,
  id: string,
  lastSeenAt: Date,
  expiresAt: Date,
) {
  await db
    .update(schema.sessions)
    .set({ lastSeenAt, expiresAt })
    .where(eq(schema.sessions.id, id));
}

async function revokeSession(db: Db, id: string, revokedAt: Date) {
  await db
    .update(schema.sessions)
    .set({ revokedAt })
    .where(eq(schema.sessions.id, id));
}

function toUserWithHash(
  row: typeof schema.users.$inferSelect,
): AuthUserWithHash {
  return {
    id: row.id,
    username: row.username,
    phone: row.phone,
    displayNameAr: row.displayNameAr,
    role: row.role,
    isActive: row.isActive,
    mustChangePassword: row.mustChangePassword,
    passwordHash: row.passwordHash,
  };
}

function toSession(row: typeof schema.sessions.$inferSelect): AuthSession {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    lastSeenAt: row.lastSeenAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  };
}
