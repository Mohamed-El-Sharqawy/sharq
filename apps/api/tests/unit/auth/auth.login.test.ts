// FR-AUTH-01 / FR-AUTH-08 (EC-25) — login semantics against a mocked
// repository. Username or phone both resolve; every failure path — wrong
// password, unknown identifier, deactivated account — returns the SAME
// generic code (no user enumeration); the disabled-account attempt is
// audited per FR-AUTH-08/EC-25.
import { describe, expect, it } from "bun:test";
import { hashPassword } from "../../../src/modules/auth/password";
import { sha256Hex } from "../../../src/modules/auth/token";
import { createAuthService } from "../../../src/modules/auth/service";
import { createMemoryLockoutStore } from "../../../src/modules/auth/lockout";
import {
  T0,
  makeAudit,
  makeRepo,
  makeUser,
  minutes,
  type UserWithHash,
} from "./helpers";

const PASSWORD = "pw-secret-1";

async function makeService(users: UserWithHash[]) {
  const { repo, sessions, calls } = makeRepo(users);
  const audit = makeAudit();
  const service = createAuthService({
    repo,
    lockout: createMemoryLockoutStore(),
    audit,
  });
  return { service, sessions, calls, audit };
}

describe("FR-AUTH-01 · login by username or phone", () => {
  it("given valid username + password, when logging in, then a session row is created for the SHA-256 of the token", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { service, sessions } = await makeService([user]);

    const result = await service.login(
      { identifier: "ahmed", password: PASSWORD },
      T0,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sessions.has(sha256Hex(result.token))).toBe(true);
  });

  it("given the same credentials by phone, when logging in, then the same account is reached", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { service } = await makeService([user]);

    const result = await service.login(
      { identifier: "+201000000003", password: PASSWORD },
      T0,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.id).toBe(user.id);
  });

  it("given no idle override, when a session is created, then expiry comes from the registry default (240 min)", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { service, sessions } = await makeService([user]);

    const result = await service.login(
      { identifier: "ahmed", password: PASSWORD },
      T0,
    );
    if (!result.ok) throw new Error("login failed");

    const stored = sessions.get(sha256Hex(result.token));
    expect(stored?.expiresAt.getTime()).toBe(T0.getTime() + minutes(240));
  });

  it("given a successful login, when the result is inspected, then the user carries no password hash and flags must_change_password", async () => {
    const user = makeUser({
      passwordHash: await hashPassword(PASSWORD),
      mustChangePassword: true,
    });
    const { service } = await makeService([user]);

    const result = await service.login(
      { identifier: "ahmed", password: PASSWORD },
      T0,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mustChangePassword).toBe(true);
    expect(Object.hasOwn(result.user, "passwordHash")).toBe(false);
  });

  it("given a login with request context, when the session row is written, then ip and user agent are recorded", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { service, calls } = await makeService([user]);

    await service.login(
      {
        identifier: "ahmed",
        password: PASSWORD,
        ip: "10.1.2.3",
        userAgent: "bun-test",
      },
      T0,
    );

    expect(calls.insertSession[0]?.ip).toBe("10.1.2.3");
    expect(calls.insertSession[0]?.userAgent).toBe("bun-test");
  });
});

describe("FR-AUTH-01 · wrong credentials → one generic failure, counted", () => {
  it("given a wrong password, when logging in, then the failure is generic and no session row exists", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { service, sessions } = await makeService([user]);

    const result = await service.login(
      { identifier: "ahmed", password: "nope" },
      T0,
    );

    expect(result).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
    expect(sessions.size).toBe(0);
  });

  it("given an unknown identifier, when logging in, then the failure is the SAME generic code (no enumeration)", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { service } = await makeService([user]);

    const wrongPw = await service.login(
      { identifier: "ahmed", password: "nope" },
      T0,
    );
    const unknown = await service.login(
      { identifier: "ghost", password: "nope" },
      T0,
    );

    expect(unknown).toEqual(wrongPw);
  });
});

describe("FR-AUTH-08 · EC-25 · disabled account tries login", () => {
  it("given a deactivated account and its CORRECT password, when logging in, then the generic failure is returned", async () => {
    const user = makeUser({
      isActive: false,
      passwordHash: await hashPassword(PASSWORD),
    });
    const { service, sessions } = await makeService([user]);

    const result = await service.login(
      { identifier: "ahmed", password: PASSWORD },
      T0,
    );

    expect(result).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
    expect(sessions.size).toBe(0);
  });

  it("given a deactivated account attempt, when it lands, then the attempt is written to the audit trail", async () => {
    const user = makeUser({
      isActive: false,
      passwordHash: await hashPassword(PASSWORD),
    });
    const { service, audit } = await makeService([user]);

    await service.login({ identifier: "ahmed", password: PASSWORD }, T0);

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]?.action).toBe("auth.login_denied");
    expect(audit.entries[0]?.entityType).toBe("user");
    expect(audit.entries[0]?.entityId).toBe(user.id);
  });
});
