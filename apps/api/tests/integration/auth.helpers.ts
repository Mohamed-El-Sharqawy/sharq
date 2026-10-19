// Auth-specific integration fixtures. The TESTING §7 personas are seeded by
// db/seed.ts into the dev database — integration containers start empty, so
// suites build their own rows here. Hashing goes through the module under
// test (password.ts) to pin the real argon2id verify path; hashing costs
// ≈50 ms/op, so keep the number of fixture users per suite minimal.
import * as schema from "../../src/db/schema";
import { hashPassword } from "../../src/modules/auth/password";
import type { AuditPort, AuthRole } from "../../src/modules/auth/types";
import type { TestDb } from "./helpers";

let seq = 0;
const next = (prefix: string) => `${prefix}-${++seq}`;

export type AuthFixture = {
  id: string;
  username: string;
  phone: string | null;
  password: string;
};

export async function insertAuthUser(
  db: TestDb["db"],
  opts: { password: string; role?: AuthRole; isActive?: boolean },
): Promise<AuthFixture> {
  const username = next("user");
  const phone = next("+20100");
  const rows = await db
    .insert(schema.users)
    .values({
      username,
      phone,
      displayNameAr: next("person"),
      passwordHash: await hashPassword(opts.password),
      role: opts.role ?? "employee",
      isActive: opts.isActive ?? true,
    })
    .returning({ id: schema.users.id });
  const row = rows[0];
  if (!row) throw new Error("fixture auth user insert returned no row");
  return { id: row.id, username, phone, password: opts.password };
}

// AuditPort writing the real audit_log table — lets suites assert the
// service's audit emissions at DB level until the src-side audit helper
// lands (row 12). The plugin suites (rows 9-10) reuse this.
export function drizzleAuditPort(db: TestDb["db"]): AuditPort {
  return {
    async record(entry) {
      await db.insert(schema.auditLog).values({
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorId: entry.actorId ?? null,
        note: entry.note ?? null,
        ip: entry.ip ?? null,
      });
    },
  };
}
