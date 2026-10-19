// SPEC §10.1/§15 — the audit writer: one drizzle-backed AuditPort the auth
// service (and later plugins) emit through. audit_log is append-only at
// the role level (FR-AUD-04). §15 conventions every entry follows:
//   action     "domain.event" (auth.lockout, auth.login_denied, and later
//              users.create, settings.update, periods.lock …)
//   entityType the entity noun ("user", "team", "period" …)
//   entityId   the row's id (string)
//   actorId    who did it — null when the actor is anonymous
//   oldValue/newValue  the JSON before/after (§15 "old/new")
//   note       the human reason ("reason" per FR-AUD-01/02)
//   ip         the actor's address when known
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import type { AuditEntry, AuditPort } from "../modules/auth/types";

type Db = PostgresJsDatabase<typeof schema>;

export function createDrizzleAudit(db: Db): AuditPort {
  return {
    async record(entry: AuditEntry) {
      await db.insert(schema.auditLog).values({
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorId: entry.actorId ?? null,
        oldValue: entry.oldValue ?? null,
        newValue: entry.newValue ?? null,
        note: entry.note ?? null,
        ip: entry.ip ?? null,
      });
    },
  };
}
