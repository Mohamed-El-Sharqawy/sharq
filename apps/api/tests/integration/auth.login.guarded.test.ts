// Row 8 TEST suite (2/2): the guarded edges of login over real Postgres —
// a deactivated account fails generically and the attempt is audited
// (FR-AUTH-08, EC-25); duplicate username/phone dies on the DB unique
// indexes (EC-23 — the field-level Arabic message is the HTTP plugin's,
// rows 9/12). One container per suite file (TESTING §7).
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import * as schema from "../../src/db/schema";
import { createMemoryLockoutStore } from "../../src/modules/auth/lockout";
import { createDrizzleAuthRepo } from "../../src/modules/auth/repository";
import { createAuthService } from "../../src/modules/auth/service";
import {
  drizzleAuditPort,
  insertAuthUser,
  type AuthFixture,
} from "./auth.helpers";
import {
  errorCode,
  PG_UNIQUE_VIOLATION,
  startTestDb,
  type TestDb,
} from "./helpers";

let t: TestDb;
let service: ReturnType<typeof createAuthService>;
// One fixture serves both describes: its username/phone are the "taken"
// values for EC-23, and isActive=false drives the FR-AUTH-08 specs.
let user: AuthFixture;

beforeAll(async () => {
  t = await startTestDb();
  service = createAuthService({
    repo: createDrizzleAuthRepo(t.db),
    lockout: createMemoryLockoutStore(),
    audit: drizzleAuditPort(t.db),
  });
  user = await insertAuthUser(t.db, {
    password: "Int-Guard#2026",
    isActive: false,
  });
}, 60_000);

afterAll(() => t.stop(), 30_000);

describe("FR-AUTH-08 · EC-25 · deactivated account login", () => {
  it("given a deactivated account and its CORRECT password, when submitted, then the same generic failure returns", async () => {
    const result = await service.login(
      { identifier: user.username, password: user.password },
      new Date("2026-10-18T11:00:00Z"),
    );
    expect(result).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
  });

  it("given the denied attempt, when audit_log is read, then auth.login_denied names that user", async () => {
    const rows = await t.query<
      { entity_id: string; actor_id: string | null }[]
    >`
      select entity_id, actor_id from audit_log
       where action = 'auth.login_denied' and entity_id = ${user.id}`;
    expect(rows.length).toBe(1);
    expect(rows[0]?.actor_id).toBe(user.id);
  });

  it("given the denied attempt, when sessions are counted for that user, then none was created", async () => {
    const rows = await t.query<{ n: number }[]>`
      select count(*)::int as n from sessions where user_id = ${user.id}`;
    expect(rows[0]?.n).toBe(0);
  });
});

describe("EC-23 · duplicate username/phone rejected by the unique indexes", () => {
  it("given a second user with a taken username, when inserted, then 23505 unique violation", async () => {
    const code = await errorCode(
      t.db.insert(schema.users).values({
        username: user.username,
        displayNameAr: "duplicate",
        passwordHash: "not-used",
        role: "employee",
      }),
    );
    expect(code).toBe(PG_UNIQUE_VIOLATION);
  });

  it("given a second user with a taken phone, when inserted, then 23505 unique violation", async () => {
    const code = await errorCode(
      t.db.insert(schema.users).values({
        username: "fresh-username",
        phone: user.phone,
        displayNameAr: "duplicate",
        passwordHash: "not-used",
        role: "employee",
      }),
    );
    expect(code).toBe(PG_UNIQUE_VIOLATION);
  });
});
