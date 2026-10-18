// FR-AUTH-03 / FR-AUTH-02 — session resolution and logout against a mocked
// repository (TESTING §4.2). The service owns the sliding-window rule: a live
// session is touched (lastSeenAt = now, expiresAt recomputed); an expired,
// revoked or unknown token resolves to nothing.
import { describe, expect, it } from "bun:test";
import { hashPassword } from "../../../src/modules/auth/password";
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

const IDLE_MINUTES = 60;
const PASSWORD = "pw-secret-1";

async function makeService(users: UserWithHash[]) {
  const { repo, sessions, calls } = makeRepo(users);
  const audit = makeAudit();
  const service = createAuthService({
    repo,
    lockout: createMemoryLockoutStore(),
    audit,
    idleMinutes: IDLE_MINUTES,
  });
  return { service, sessions, calls, audit };
}

async function loggedInToken(
  service: Awaited<ReturnType<typeof makeService>>["service"],
) {
  const result = await service.login(
    { identifier: "ahmed", password: PASSWORD },
    T0,
  );
  if (!result.ok) throw new Error("fixture login failed");
  return result.token;
}

describe("FR-AUTH-03 · session resolution (sliding idle window)", () => {
  it("given a live session, when any request resolves it, then lastSeenAt slides and expiry is recomputed", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { service, calls } = await makeService([user]);
    const token = await loggedInToken(service);

    const at = new Date(T0.getTime() + minutes(5));
    const resolved = await service.resolveSession(token, at);
    if (!resolved) throw new Error("live session must resolve");

    expect(resolved.user.id).toBe(user.id);
    expect(resolved.session.expiresAt.getTime()).toBe(
      at.getTime() + minutes(60),
    );
    expect(calls.touchSession).toEqual([
      {
        id: resolved.session.id,
        lastSeenAt: at,
        expiresAt: new Date(at.getTime() + minutes(60)),
      },
    ]);
  });

  it("given a session idle past security.sessionIdleMinutes, when resolved, then it is dead (FR-AUTH-03 401 path)", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { service, calls } = await makeService([user]);
    const token = await loggedInToken(service);

    const expired = new Date(T0.getTime() + minutes(60));
    expect(await service.resolveSession(token, expired)).toBeNull();
    expect(calls.touchSession).toEqual([]);
  });

  it("given a revoked session, when resolved, then it is dead even inside the idle window", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { service } = await makeService([user]);
    const token = await loggedInToken(service);

    await service.logout(token, new Date(T0.getTime() + minutes(1)));
    expect(
      await service.resolveSession(token, new Date(T0.getTime() + minutes(2))),
    ).toBeNull();
  });

  it("given a token that was never issued, when resolved, then the result is null", async () => {
    const { service } = await makeService([makeUser()]);
    expect(await service.resolveSession("no-such-token", T0)).toBeNull();
  });
});

describe("FR-AUTH-02 · logout (service half: revoke the row)", () => {
  it("given a logged-in session, when logged out, then the session row is revoked once", async () => {
    const user = makeUser({ passwordHash: await hashPassword(PASSWORD) });
    const { service, calls } = await makeService([user]);
    const token = await loggedInToken(service);

    await service.logout(token, new Date(T0.getTime() + minutes(1)));
    await service.logout(token, new Date(T0.getTime() + minutes(2)));

    expect(calls.revoked).toHaveLength(1);
  });

  it("given an unknown token, when logged out, then logout is a silent no-op", async () => {
    const { service, calls } = await makeService([makeUser()]);
    await service.logout("no-such-token", T0);
    expect(calls.revoked).toEqual([]);
  });
});
