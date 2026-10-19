// SPEC §7 — audit_log: append-only by grant, not by convention. The initial
// migration creates the sharq_app role, grants it DML everywhere, then
// REVOKES update/delete here — the database itself refuses tampering.
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    note: text("note"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    ip: text("ip"),
  },
  (t) => [
    index("audit_log_at_idx").on(t.at),
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_actor_id_idx").on(t.actorId),
  ],
);
