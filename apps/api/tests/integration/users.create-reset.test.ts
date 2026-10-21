// EC-23 + FR-AUTH-05 over real Postgres (roadmap row 3): duplicate
// username/phone come back as DUPLICATE carrying the conflicting field
// (users_*_unique 23505 → designed result, never a 500), and an admin
// reset revokes EVERY live session before swapping the hash — the old
// temp password dies, the new one logs in with must_change_password set.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createDrizzleAudit } from "../../src/lib/audit";
import { createMemoryLockoutStore } from "../../src/modules/auth/lockout";
import { login } from "../../src/modules/auth/login";
import { createDrizzleAuthRepo } from "../../src/modules/auth/repository";
import { createUser } from "../../src/modules/users/create-user";
import { resetPassword } from "../../src/modules/users/lifecycle";
import { createDrizzleUsersRepo } from "../../src/modules/users/repository";
import { startTestDb, insertUser, type TestDb } from "./helpers";

let db: TestDb;
const NOW = new Date("2026-10-19T10:00:00Z");
let ADMIN: string; // a real user row — audit_log.actor_id has an FK to users

beforeAll(async () => {
  db = await startTestDb();
  ADMIN = await insertUser(db.db, "admin");
}, 60_000);
afterAll(() => db.stop(), 30_000);

function userDeps() {
  return {
    repo: createDrizzleUsersRepo(db.db),
    audit: createDrizzleAudit(db.db),
  };
}

function authDeps() {
  return {
    repo: createDrizzleAuthRepo(db.db),
    lockout: createMemoryLockoutStore(),
    audit: createDrizzleAudit(db.db),
  };
}

function signIn(username: string, password: string) {
  return login(authDeps(), { identifier: username, password }, NOW);
}

describe("EC-23 · duplicate user rejection (live unique indexes)", () => {
  it("given a created user, when created again with the same username, then DUPLICATE carries field username and no second audit lands", async () => {
    const first = await createUser(userDeps(), {
      actorId: ADMIN,
      username: "dup-user",
      displayNameAr: "الأول",
      role: "employee",
    });
    if (!first.ok) throw new Error("fixture create failed");
    const second = await createUser(userDeps(), {
      actorId: ADMIN,
      username: "dup-user",
      displayNameAr: "الثاني",
      role: "employee",
    });
    expect(second).toEqual({ ok: false, code: "DUPLICATE", field: "username" });
    const audits = await db.query`
      select id from audit_log
      where action = 'users.create' and entity_id = ${first.user.id}`;
    expect(audits).toHaveLength(1);
  });

  it("given a user with a phone, when created again with the same phone, then DUPLICATE carries field phone", async () => {
    const first = await createUser(userDeps(), {
      actorId: ADMIN,
      username: "phone-first",
      phone: "+201000000001",
      displayNameAr: "الأول",
      role: "employee",
    });
    if (!first.ok) throw new Error("fixture create failed");
    const second = await createUser(userDeps(), {
      actorId: ADMIN,
      username: "phone-second",
      phone: "+201000000001",
      displayNameAr: "الثاني",
      role: "employee",
    });
    expect(second).toEqual({ ok: false, code: "DUPLICATE", field: "phone" });
  });
});

describe("FR-AUTH-05 · admin reset revokes sessions and swaps the hash", () => {
  let userId: string;
  let username: string;
  let temp1: string;
  let temp2: string;

  beforeAll(async () => {
    const created = await createUser(userDeps(), {
      actorId: ADMIN,
      username: "reset-user",
      displayNameAr: "مستخدم",
      role: "employee",
    });
    if (!created.ok) throw new Error("fixture create failed");
    userId = created.user.id;
    username = created.user.username;
    temp1 = created.tempPassword;
    const first = await signIn(username, temp1);
    if (!first.ok) throw new Error("fixture login failed");
    const reset = await resetPassword(
      userDeps(),
      { actorId: ADMIN, userId },
      NOW,
    );
    if (!reset.ok) throw new Error("fixture reset failed");
    temp2 = reset.tempPassword;
  }, 60_000);

  it("given a logged-in user, when the password is reset, then the live session is revoked and must_change_password is set", async () => {
    const sessions = await db.query`
      select revoked_at from sessions where user_id = ${userId}`;
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.revoked_at).not.toBeNull();
    const row = await db.query`
      select must_change_password from users where id = ${userId}`;
    expect(row[0]?.must_change_password).toBe(true);
  });

  it("given the reset, when logging in, then the old temp password is dead and the new one works with must_change_password", async () => {
    const stale = await signIn(username, temp1);
    expect(stale).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
    const fresh = await signIn(username, temp2);
    if (!fresh.ok) throw new Error("new temp password must log in");
    expect(fresh.mustChangePassword).toBe(true);
  });

  it("given the reset, when the audit trail is inspected, then exactly one users.password_reset row exists", async () => {
    const rows = await db.query`
      select id from audit_log
      where action = 'users.password_reset' and entity_id = ${userId}`;
    expect(rows).toHaveLength(1);
  });
});
