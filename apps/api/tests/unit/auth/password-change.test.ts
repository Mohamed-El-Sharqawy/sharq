// FR-AUTH-07 — change own password: current password required, the change is
// audited, other sessions stay valid (no revocation), and the change round-
// trips through login. Mocked ports per §4.2.
import { describe, expect, it } from "bun:test";
import { createMemoryLockoutStore } from "../../../src/modules/auth/lockout";
import { login } from "../../../src/modules/auth/login";
import { changePassword } from "../../../src/modules/auth/password-change";
import {
  makeAudit,
  makeRepo,
  makeUser,
  minutes,
  T0,
  type UserWithHash,
} from "./helpers";

const user = (overrides: Partial<UserWithHash> = {}) =>
  makeUser({ passwordHash: "old-hash", ...overrides });

describe("FR-AUTH-07 · change own password", () => {
  it("given the correct current password, when changed, then the stored hash is replaced and the change is audited", async () => {
    const u = user();
    const { repo, calls } = makeRepo([u]);
    const audit = makeAudit();
    const result = await changePassword(
      { repo, audit },
      { userId: u.id, current: "pw", next: "new-pw" },
      T0,
    );
    expect(result).toEqual({ ok: true });
    expect(calls.updated).toHaveLength(1);
    const update = calls.updated[0]!;
    expect(update.id).toBe(u.id);
    expect(update.at.getTime()).toBe(T0.getTime());
    // The stored hash must verify the NEW password, not the old one.
    expect(await Bun.password.verify("new-pw", update.passwordHash)).toBe(true);
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: "auth.password_changed",
      entityType: "user",
      entityId: u.id,
      actorId: u.id,
    });
  });

  it("given a wrong current password, when changed, then INVALID_CREDENTIALS returns and nothing is written", async () => {
    const u = user();
    const { repo, calls } = makeRepo([u]);
    const audit = makeAudit();
    const result = await changePassword(
      { repo, audit },
      { userId: u.id, current: "wrong", next: "new-pw" },
      T0,
    );
    expect(result).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
    expect(calls.updated).toHaveLength(0);
    expect(audit.entries).toHaveLength(0);
  });

  it("given an unknown user id, when changed, then the same generic failure returns", async () => {
    const { repo, calls } = makeRepo([user()]);
    const audit = makeAudit();
    const result = await changePassword(
      { repo, audit },
      { userId: crypto.randomUUID(), current: "pw", next: "new-pw" },
      T0,
    );
    expect(result).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
    expect(calls.updated).toHaveLength(0);
    expect(audit.entries).toHaveLength(0);
  });

  it("given a live session, when the password changes, then no session is revoked or touched (other devices stay logged in)", async () => {
    const u = user();
    const { repo, calls, sessions } = makeRepo([u]);
    await repo.insertSession({
      userId: u.id,
      tokenHash: "tok-hash",
      lastSeenAt: T0,
      expiresAt: new Date(T0.getTime() + minutes(240)),
      ip: null,
      userAgent: null,
    });
    await changePassword(
      { repo, audit: makeAudit() },
      { userId: u.id, current: "pw", next: "new-pw" },
      T0,
    );
    expect(calls.revoked).toHaveLength(0);
    expect(calls.touchSession).toHaveLength(0);
    expect([...sessions.values()][0]!.revokedAt).toBeNull();
  });

  it("given the change succeeded, when the user logs in, then the new password works and the old one does not", async () => {
    const u = user({ passwordHash: await Bun.password.hash("old-pw") });
    const { repo } = makeRepo([u]);
    const deps = {
      repo,
      lockout: createMemoryLockoutStore(),
      audit: makeAudit(),
    };
    await changePassword(
      { repo, audit: deps.audit },
      { userId: u.id, current: "old-pw", next: "brand-new-pw" },
      T0,
    );
    const ok = await login(
      deps,
      { identifier: u.username, password: "brand-new-pw" },
      T0,
    );
    const stale = await login(
      deps,
      { identifier: u.username, password: "old-pw" },
      T0,
    );
    expect(ok.ok).toBe(true);
    expect(stale).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
  });
});
