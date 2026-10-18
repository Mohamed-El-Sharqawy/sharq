// SPEC §10.2 — lockout: 5 consecutive failures lock the identifier for
// 15 minutes, and the lock is audited. The counter lives behind a
// LockoutStore port; the in-memory store is the v1 implementation (§7
// defines no lockout table — restart resets brute-force counters by design).
// EC-25's audit half lives in the login suite.
import { describe, expect, it } from "bun:test";
import { hashPassword } from "../../../src/modules/auth/password";
import { createAuthService } from "../../../src/modules/auth/service";
import { createMemoryLockoutStore } from "../../../src/modules/auth/lockout";
import { T0, makeAudit, makeRepo, makeUser, minutes } from "./helpers";

const PASSWORD = "pw-secret-1";

describe("SPEC §10.2 · lockout counter math (memory store)", () => {
  it("given 4 consecutive failures, when the identifier is checked, then it is not locked yet", () => {
    const lockout = createMemoryLockoutStore();
    for (let i = 0; i < 4; i++) lockout.recordFailure("ahmed", T0);
    expect(lockout.isLocked("ahmed", T0)).toBe(false);
  });

  it("given a 5th consecutive failure, when the identifier is checked, then it is locked for exactly 15 minutes", () => {
    const lockout = createMemoryLockoutStore();
    for (let i = 0; i < 5; i++) lockout.recordFailure("ahmed", T0);
    expect(lockout.isLocked("ahmed", T0)).toBe(true);
    expect(lockout.lockedUntil("ahmed")?.getTime()).toBe(
      T0.getTime() + minutes(15),
    );
  });

  it("given a locked identifier, when failures keep landing, then the lock is not extended", () => {
    const lockout = createMemoryLockoutStore();
    for (let i = 0; i < 5; i++) lockout.recordFailure("ahmed", T0);
    const until = lockout.lockedUntil("ahmed")?.getTime();

    lockout.recordFailure("ahmed", new Date(T0.getTime() + minutes(14)));
    expect(lockout.lockedUntil("ahmed")?.getTime()).toBe(until);
  });

  it("given a lock that has expired, when failures resume, then the count starts from zero again", () => {
    const lockout = createMemoryLockoutStore();
    for (let i = 0; i < 5; i++) lockout.recordFailure("ahmed", T0);
    const afterLock = new Date(T0.getTime() + minutes(15) + 1);

    expect(lockout.isLocked("ahmed", afterLock)).toBe(false);
    for (let i = 0; i < 4; i++) lockout.recordFailure("ahmed", afterLock);
    expect(lockout.isLocked("ahmed", afterLock)).toBe(false);
    lockout.recordFailure("ahmed", afterLock);
    expect(lockout.isLocked("ahmed", afterLock)).toBe(true);
  });

  it("given a successful login mid-sequence, when failures resume, then the counter was reset", () => {
    const lockout = createMemoryLockoutStore();
    for (let i = 0; i < 4; i++) lockout.recordFailure("ahmed", T0);
    lockout.reset("ahmed");
    for (let i = 0; i < 4; i++) lockout.recordFailure("ahmed", T0);
    expect(lockout.isLocked("ahmed", T0)).toBe(false);
  });
});

describe("SPEC §10.2 · lockout enforced by the service (audited)", () => {
  it("given 5 consecutive failures, when the correct password arrives, then login is RATE_LIMITED for 900s", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { repo } = makeRepo([user]);
    const service = createAuthService({
      repo,
      lockout: createMemoryLockoutStore(),
      audit: makeAudit(),
    });

    for (let i = 0; i < 5; i++) {
      await service.login({ identifier: "ahmed", password: "wrong" }, T0);
    }
    const locked = await service.login(
      { identifier: "ahmed", password: PASSWORD },
      T0,
    );

    expect(locked).toEqual({
      ok: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: 900,
    });
  });

  it("given the lockout moment, when the 5th failure lands, then exactly one auth.lockout audit row is emitted", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { repo } = makeRepo([user]);
    const audit = makeAudit();
    const service = createAuthService({
      repo,
      lockout: createMemoryLockoutStore(),
      audit,
    });

    for (let i = 0; i < 4; i++) {
      await service.login({ identifier: "ahmed", password: "wrong" }, T0);
    }
    expect(audit.entries).toEqual([]);

    await service.login({ identifier: "ahmed", password: "wrong" }, T0);
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]?.action).toBe("auth.lockout");
    expect(audit.entries[0]?.entityId).toBe(user.id);
    expect(audit.entries[0]?.note).toContain("ahmed");
  });

  it("given a locked identifier past 15 minutes, when the correct password arrives, then login succeeds again", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { repo } = makeRepo([user]);
    const service = createAuthService({
      repo,
      lockout: createMemoryLockoutStore(),
      audit: makeAudit(),
    });

    for (let i = 0; i < 5; i++) {
      await service.login({ identifier: "ahmed", password: "wrong" }, T0);
    }
    const afterLock = new Date(T0.getTime() + minutes(15) + 1_000);
    const retry = await service.login(
      { identifier: "ahmed", password: PASSWORD },
      afterLock,
    );

    expect(retry.ok).toBe(true);
  });
});
