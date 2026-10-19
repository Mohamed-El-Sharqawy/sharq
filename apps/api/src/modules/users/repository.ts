// SPEC §10.1 — users repository (writes): drizzle queries only. EC-23
// duplicates and §10.4 version conflicts are DESIGNED outcomes mapped from
// PG errors / conditional updates — never thrown as 500s. Reads live in
// user-reads.ts; shared row plumbing in rows.ts. Query bodies stay at
// module level; the factory only binds the db (ESLint counts closures).
import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import { pgErrorInfo } from "../../lib/pg";
import { findUser, listUsers } from "./user-reads";
import { liveUser, toUser } from "./rows";
import type { AdminUser, DuplicateField, UsersRepo } from "./service";

type Db = PostgresJsDatabase<typeof schema>;

export function createDrizzleUsersRepo(db: Db): UsersRepo {
  return {
    insertUser: (input) => insertUser(db, input),
    findUser: (id) => findUser(db, id),
    updateUser: (id, patch, expectedVersion, now) =>
      updateUser(db, { id, patch, expectedVersion, now }),
    setPassword: (id, passwordHash, mustChangePassword, now) =>
      setPassword(db, { id, passwordHash, mustChangePassword, now }),
    setActive: (id, isActive, expectedVersion, now) =>
      setActive(db, { id, isActive, expectedVersion, now }),
    revokeAllSessions: (userId, now) => revokeAllSessions(db, userId, now),
    listUsers: (query) => listUsers(db, query),
  };
}

async function insertUser(
  db: Db,
  input: Parameters<UsersRepo["insertUser"]>[0],
): Promise<AdminUser | { duplicate: DuplicateField }> {
  try {
    const rows = await db.insert(schema.users).values(input).returning();
    const row = rows[0];
    if (!row) throw new Error("user insert returned no row");
    return toUser(row);
  } catch (error) {
    const duplicate = duplicateFrom(error);
    if (duplicate) return { duplicate };
    throw error;
  }
}

/** EC-23 — map the DESIGNED unique constraints only; anything else rethrows. */
function duplicateFrom(error: unknown): DuplicateField | undefined {
  const { code, constraint } = pgErrorInfo(error);
  if (code !== "23505") return undefined;
  if (constraint === "users_username_unique") return "username";
  if (constraint === "users_phone_unique") return "phone";
  return undefined;
}

async function updateUser(
  db: Db,
  args: {
    id: string;
    patch: Parameters<UsersRepo["updateUser"]>[1];
    expectedVersion: number;
    now: Date;
  },
): Promise<AdminUser | "VERSION_CONFLICT" | { duplicate: DuplicateField }> {
  try {
    // drizzle skips undefined keys — absent patch fields stay untouched.
    const rows = await db
      .update(schema.users)
      .set({
        ...args.patch,
        version: args.expectedVersion + 1,
        updatedAt: args.now,
      })
      .where(
        and(
          liveUser,
          eq(schema.users.id, args.id),
          eq(schema.users.version, args.expectedVersion),
        ),
      )
      .returning();
    const row = rows[0];
    return row ? toUser(row) : "VERSION_CONFLICT";
  } catch (error) {
    const duplicate = duplicateFrom(error);
    if (duplicate) return { duplicate };
    throw error;
  }
}

async function setPassword(
  db: Db,
  args: {
    id: string;
    passwordHash: string;
    mustChangePassword: boolean;
    now: Date;
  },
) {
  await db
    .update(schema.users)
    .set({
      passwordHash: args.passwordHash,
      mustChangePassword: args.mustChangePassword,
      updatedAt: args.now,
    })
    .where(and(liveUser, eq(schema.users.id, args.id)));
}

async function setActive(
  db: Db,
  args: {
    id: string;
    isActive: boolean;
    expectedVersion: number;
    now: Date;
  },
): Promise<AdminUser | "VERSION_CONFLICT"> {
  const rows = await db
    .update(schema.users)
    .set({
      isActive: args.isActive,
      version: args.expectedVersion + 1,
      updatedAt: args.now,
    })
    .where(
      and(
        liveUser,
        eq(schema.users.id, args.id),
        eq(schema.users.version, args.expectedVersion),
      ),
    )
    .returning();
  const row = rows[0];
  return row ? toUser(row) : "VERSION_CONFLICT";
}

/** FR-AUTH-05/06 — every still-live session of the user dies at once. */
async function revokeAllSessions(db: Db, userId: string, now: Date) {
  await db
    .update(schema.sessions)
    .set({ revokedAt: now })
    .where(
      and(
        eq(schema.sessions.userId, userId),
        isNull(schema.sessions.revokedAt),
      ),
    );
}
