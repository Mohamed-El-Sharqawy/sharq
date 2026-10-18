// Row 8 TEST suite (1/2): the composed login path — service + drizzle repo —
// over real Postgres (TESTING §7). The HTTP plugin is row 9, so the suites
// drive service.login(...) directly and check the sessions table. Unit
// counterparts (mocked ports) live in tests/unit/auth/ (rows 6-7).
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createMemoryLockoutStore } from "../../src/modules/auth/lockout";
import { createDrizzleAuthRepo } from "../../src/modules/auth/repository";
import { createAuthService } from "../../src/modules/auth/service";
import { sha256Hex } from "../../src/modules/auth/token";
import {
  drizzleAuditPort,
  insertAuthUser,
  type AuthFixture,
} from "./auth.helpers";
import { startTestDb, type TestDb } from "./helpers";

let t: TestDb;
let service: ReturnType<typeof createAuthService>;
let user: AuthFixture;
const NOW = new Date("2026-10-18T10:00:00Z");

beforeAll(async () => {
  t = await startTestDb();
  service = createAuthService({
    repo: createDrizzleAuthRepo(t.db),
    lockout: createMemoryLockoutStore(),
    audit: drizzleAuditPort(t.db),
  });
  user = await insertAuthUser(t.db, {
    password: "Int-Login#2026",
    role: "admin",
  });
}, 60_000);

afterAll(() => t.stop(), 30_000);

describe("FR-AUTH-01 · login by username over real Postgres", () => {
  it("given username + correct password, when submitted, then a session row is created whose hash is the returned token's", async () => {
    const result = await service.login(
      {
        identifier: user.username,
        password: user.password,
        ip: "10.0.0.9",
        userAgent: "bun-int",
      },
      NOW,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("login should succeed");
    expect(result.user.username).toBe(user.username);
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.expiresAt.getTime() - NOW.getTime()).toBe(240 * 60_000);
    const rows = await t.query<
      {
        token_hash: string;
        ip: string | null;
        user_agent: string | null;
        expires_at: Date;
        revoked_at: Date | null;
      }[]
    >`select token_hash, ip, user_agent, expires_at, revoked_at
        from sessions where user_id = ${user.id}`;
    const row = rows[0];
    if (!row) throw new Error("no session row was persisted");
    expect(rows.length).toBe(1);
    expect(row.token_hash).toBe(sha256Hex(result.token));
    expect(row.ip).toBe("10.0.0.9");
    expect(row.user_agent).toBe("bun-int");
    expect(row.expires_at.getTime()).toBe(result.expiresAt.getTime());
    expect(row.revoked_at).toBeNull();
  });
});

describe("FR-AUTH-01 · login by phone over real Postgres", () => {
  it("given the phone number instead of the username, when submitted, then the same account logs in", async () => {
    const result = await service.login(
      { identifier: user.phone ?? "", password: user.password },
      NOW,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("login by phone should succeed");
    expect(result.user.id).toBe(user.id);
  });
});

describe("FR-AUTH-01 · wrong credentials fail generically", () => {
  it("given a wrong password, when submitted, then INVALID_CREDENTIALS returns and no extra session row exists", async () => {
    // A failed attempt must not create a session row — count is unchanged
    // (the earlier successful logins already own their rows).
    const count = () =>
      t.query<{ n: number }[]>`
        select count(*)::int as n from sessions where user_id = ${user.id}`;
    const before = (await count())[0]?.n;
    const result = await service.login(
      { identifier: user.username, password: "wrong-guess" },
      NOW,
    );
    expect(result).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
    const after = (await count())[0]?.n;
    expect(after).toBe(before);
  });

  it("given an unknown identifier, when submitted, then the failure equals a wrong password's (no user enumeration)", async () => {
    const unknown = await service.login(
      { identifier: "who-is-this", password: "wrong-guess" },
      NOW,
    );
    expect(unknown).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
  });
});
