// SPEC §10.1/§15 — the audit writer: one drizzle-backed AuditPort the auth
// service (and later plugins) emit through. audit_log is append-only at the
// role level (FR-AUD-04); the helper standards (actor/entity conventions)
// formalize here as plugins adopt them (row 12+).
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
        oldValue: null,
        newValue: null,
        note: entry.note ?? null,
        ip: entry.ip ?? null,
      });
    },
  };
}
