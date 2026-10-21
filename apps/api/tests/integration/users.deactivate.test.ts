// FR-AUTH-06 + EC-12/25/58 over real Postgres (roadmap row 3): a
// deactivated account cannot log in even with the correct password (the
// generic failure + one auth.login_denied audit, EC-25), its sessions are
// revoked, and history is never touched — membership and attendance rows
// stay, the account is not soft-deleted (EC-12/58). Reactivation lives in
// users.reactivate.test.ts.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createDrizzleAudit } from "../../src/lib/audit";
import { createMemoryLockoutStore } from "../../src/modules/auth/lockout";
import { login } from "../../src/modules/auth/login";
import { createDrizzleAuthRepo } from "../../src/modules/auth/repository";
import { createUser } from "../../src/modules/users/create-user";
import { deactivate } from "../../src/modules/users/lifecycle";
import { createDrizzleUsersRepo } from "../../src/modules/users/repository";
import {
  addEntry,
  addMembership,
  insertStatus,
  insertTeam,
  startTestDb,
  type TestDb,
} from "./helpers";

let db: TestDb;
const NOW = new Date("2026-10-19T10:00:00Z");
let adminId: string;
let userId: string;
let username: string;
let tempPassword: string;
let teamId: string;

function deps() {
  return {
    repo: createDrizzleUsersRepo(db.db),
    audit: createDrizzleAudit(db.db),
  };
}

function auth() {
  return {
    repo: createDrizzleAuthRepo(db.db),
    lockout: createMemoryLockoutStore(),
    audit: createDrizzleAudit(db.db),
  };
}

beforeAll(async () => {
  db = await startTestDb();
  const created = await createUser(deps(), {
    actorId: adminId,
    username: "lifecycle-user",
    displayNameAr: "موظف",
    role: "employee",
  });
  if (!created.ok) throw new Error("fixture create failed");
  // The user audits his own lifecycle here — actor_id needs a real user row.
  adminId = userId = created.user.id;
  username = created.user.username;
  tempPassword = created.tempPassword;
  await login(auth(), { identifier: username, password: tempPassword }, NOW);
  teamId = await insertTeam(db.db);
  await addMembership(db.db, {
    teamId,
    userId,
    validFrom: "2026-10-01",
    validTo: null,
  });
  const statusId = await insertStatus(db.db);
  await addEntry(db.db, { userId, teamId, entryDate: "2026-10-15", statusId });
  const off = await deactivate(
    deps(),
    { actorId: adminId, userId, version: 1 },
    NOW,
  );
  if (!off.ok) throw new Error("fixture deactivate failed");
});
afterAll(() => db.stop());

describe("FR-AUTH-06 · deactivate blocks login and revokes sessions (EC-25)", () => {
  it("given a deactivated user, when the CORRECT password arrives, then the generic failure returns with one login_denied audit and no live session", async () => {
    const denied = await login(
      auth(),
      { identifier: username, password: tempPassword },
      NOW,
    );
    expect(denied).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
    const sessions = await db.query`
      select revoked_at from sessions where user_id = ${userId}`;
    expect(sessions.length).toBeGreaterThan(0);
    for (const s of sessions) expect(s.revoked_at).not.toBeNull();
    const audits = await db.query`
      select id from audit_log where action = 'auth.login_denied' and entity_id = ${userId}`;
    expect(audits).toHaveLength(1);
  });
});

describe("EC-12/EC-58 · deactivation keeps history", () => {
  it("given the deactivation, when the rows are inspected, then the membership and entry are intact and the account is flagged off, not deleted", async () => {
    const user = await db.query`
      select is_active, deleted_at from users where id = ${userId}`;
    expect(user[0]?.is_active).toBe(false);
    expect(user[0]?.deleted_at).toBeNull();
    const membership = await db.query`
      select valid_to from team_memberships where user_id = ${userId}`;
    expect(membership).toHaveLength(1);
    expect(membership[0]?.valid_to).toBeNull();
    const entries = await db.query`
      select id from attendance_entries where user_id = ${userId} and deleted_at is null`;
    expect(entries).toHaveLength(1);
  });
});
