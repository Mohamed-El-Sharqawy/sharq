// SPEC §10.1 — auth repository: drizzle queries only. It maps table rows to
// the service-level types and keeps passwordHash inside this file (the
// service-level AuthUser deliberately omits it). Soft-deleted users resolve
// to nothing on both lookup paths, so a deleted account cannot log in and
// its live sessions stop resolving.
import { and, eq, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import type { AuthRepo, AuthSession, AuthUserWithHash } from "./service";

type Db = PostgresJsDatabase<typeof schema>;

/** Soft-deleted users are gone for auth purposes (§7 soft delete). */
const liveUser = isNull(schema.users.deletedAt);

export function createDrizzleAuthRepo(db: Db): AuthRepo {
  return {
    async findUserByIdentifier(identifier) {
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
    },

    async insertSession(input) {
      const rows = await db.insert(schema.sessions).values(input).returning();
      const row = rows[0];
      if (!row) throw new Error("session insert returned no row");
      return toSession(row);
    },

    async findSessionByTokenHash(tokenHash) {
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
    },

    async touchSession(id, lastSeenAt, expiresAt) {
      await db
        .update(schema.sessions)
        .set({ lastSeenAt, expiresAt })
        .where(eq(schema.sessions.id, id));
    },

    async revokeSession(id, revokedAt) {
      await db
        .update(schema.sessions)
        .set({ revokedAt })
        .where(eq(schema.sessions.id, id));
    },
  };
}

function toUserWithHash(
  row: typeof schema.users.$inferSelect,
): AuthUserWithHash {
  return {
    id: row.id,
    username: row.username,
    phone: row.phone,
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
