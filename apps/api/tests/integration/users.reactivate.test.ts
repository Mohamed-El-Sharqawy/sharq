// FR-AUTH-06 — reactivation over real Postgres (roadmap row 3): the flip
// back restores login, the flips are audited (users.deactivate /
// users.reactivate), and a flip to the state the account is already in is
// a silent no-op — the current row, no version bump, no audit entry.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createDrizzleAudit } from "../../src/lib/audit";
import { createUser } from "../../src/modules/users/create-user";
import { deactivate, reactivate } from "../../src/modules/users/lifecycle";
import { createDrizzleUsersRepo } from "../../src/modules/users/repository";
import { startTestDb, type TestDb } from "./helpers";

let db: TestDb;
const NOW = new Date("2026-10-19T10:00:00Z");
let adminId: string;
let userId: string;

function deps() {
  return {
    repo: createDrizzleUsersRepo(db.db),
    audit: createDrizzleAudit(db.db),
  };
}

beforeAll(async () => {
  db = await startTestDb();
  const created = await createUser(deps(), {
    actorId: adminId,
    username: "reactivate-user",
    displayNameAr: "موظف",
    role: "employee",
  });
  if (!created.ok) throw new Error("fixture create failed");
  // The user audits his own lifecycle here — actor_id needs a real user row.
  adminId = userId = created.user.id;
  const off = await deactivate(
    deps(),
    { actorId: adminId, userId, version: 1 },
    NOW,
  );
  if (!off.ok) throw new Error("fixture deactivate failed");
});
afterAll(() => db.stop());

describe("FR-AUTH-06 · reactivate restores access; no-op flips are silent", () => {
  it("given the deactivated fixture user, when deactivated again, then the current row returns with no version bump and no second audit", async () => {
    const again = await deactivate(
      deps(),
      { actorId: adminId, userId, version: 2 },
      NOW,
    );
    if (!again.ok) throw new Error(`expected no-op ok, got ${again.code}`);
    expect(again.user.isActive).toBe(false);
    expect(again.user.version).toBe(2);
    const audits = await db.query`
      select id from audit_log where action = 'users.deactivate' and entity_id = ${userId}`;
    expect(audits).toHaveLength(1);
  });

  it("given the deactivated fixture user, when reactivated, then isActive flips back and both lifecycle flips are audited", async () => {
    const on = await reactivate(
      deps(),
      { actorId: adminId, userId, version: 2 },
      NOW,
    );
    if (!on.ok) throw new Error(`expected reactivate ok, got ${on.code}`);
    expect(on.user.isActive).toBe(true);
    expect(on.user.version).toBe(3);
    const audits = await db.query`
      select action from audit_log where entity_id = ${userId}
      and action in ('users.deactivate', 'users.reactivate')`;
    expect(audits.map((r) => r.action).sort()).toEqual([
      "users.deactivate",
      "users.reactivate",
    ]);
  });
});
