// Row 9 — the auth plugin (§10.6 auth rows) driven through createApp over
// mocked ports: cookie issue/clear per §10.2, generic login failure,
// lockout → 429, envelope-shaped errors incl. validation (§10.4 skeleton;
// Arabic map is row 12). Real-DB wiring is row 10's contract suite.
import { beforeAll, describe, expect, it } from "bun:test";
import { createApp } from "../../../src/app";
import { SESSION_COOKIE } from "../../../src/lib/guard";
import { hashPassword } from "../../../src/modules/auth/password";
import {
  makeAudit,
  makeRepo,
  makeUser,
  type UserWithHash,
} from "../auth/helpers";

let users: UserWithHash[];
const audit = makeAudit();
const isTeamSupervisor = async () => false;
const build = (secureCookies = false) =>
  createApp({
    repo: makeRepo(users).repo,
    audit,
    isTeamSupervisor,
    secureCookies,
  });

const PASSWORD = "Pw#Route-2026";
let admin: UserWithHash;
let cookieValue: string;

beforeAll(async () => {
  admin = makeUser({
    username: "sayed",
    displayNameAr: "سيد",
    role: "admin",
    passwordHash: await hashPassword(PASSWORD),
  });
  users = [admin];
});

const login = async (app: ReturnType<typeof createApp>, body: object) =>
  app.handle(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const withCookie = (url: string, method = "GET", body?: object) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: {
      cookie: `${SESSION_COOKIE}=${cookieValue}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

describe("POST /api/auth/login", () => {
  it("given valid credentials, when submitted, then 200 with the user and an httpOnly SameSite=Lax session cookie", async () => {
    const res = await login(build(), {
      identifier: "sayed",
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).not.toContain("Secure");
    cookieValue = setCookie.split(";")[0]!.split("=")[1]!;
    const body = await res.json();
    expect(body.user.username).toBe("sayed");
    expect(body.user.displayNameAr).toBe("سيد");
    expect(body.user).not.toHaveProperty("passwordHash");
  });

  it("given secureCookies, when login succeeds, then the cookie carries Secure (prod)", async () => {
    const res = await login(build(true), {
      identifier: "sayed",
      password: PASSWORD,
    });
    expect(res.headers.get("set-cookie")).toContain("Secure");
  });

  it("given wrong credentials, when submitted, then 401 with the generic AUTH_REQUIRED envelope", async () => {
    const res = await login(build(), {
      identifier: "sayed",
      password: "wrong",
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("AUTH_REQUIRED");
  });

  it("given a malformed body, when submitted, then 422 VALIDATION_FAILED in the §10.4 envelope", async () => {
    const res = await login(build(), { identifier: "sayed" });
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("VALIDATION_FAILED");
  });

  it("given the 5th consecutive failure for one identifier, when submitted again, then 429 RATE_LIMITED with retryAfterSeconds", async () => {
    const app = build();
    // Attempts 1-5 each return the generic failure; the 5th arms the lock.
    for (let i = 0; i < 5; i++) {
      const warmup = await login(app, {
        identifier: "sayed",
        password: `nope-${i}`,
      });
      expect(warmup.status).toBe(401);
    }
    const res = await login(app, { identifier: "sayed", password: "nope-6" });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.meta.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("GET /api/auth/me · POST /api/auth/logout", () => {
  it("given no session cookie, when /me is hit, then 401", async () => {
    const res = await build().handle(
      new Request("http://localhost/api/auth/me"),
    );
    expect(res.status).toBe(401);
  });

  it("given a login, when /me is hit with the cookie, then 200 with the session user", async () => {
    const app = build();
    await login(app, { identifier: "sayed", password: PASSWORD });
    const res = await app.handle(withCookie("/api/auth/me"));
    expect(res.status).toBe(200);
    expect((await res.json()).user.id).toBe(admin.id);
  });

  it("given a login, when logout is hit, then 204 with a cleared cookie and the token no longer resolves", async () => {
    const app = build();
    const res = await login(app, { identifier: "sayed", password: PASSWORD });
    cookieValue = res.headers.get("set-cookie")!.split(";")[0]!.split("=")[1]!;
    const out = await app.handle(withCookie("/api/auth/logout", "POST"));
    expect(out.status).toBe(204);
    const setCookie = out.headers.get("set-cookie")!;
    expect(setCookie).toContain(`${SESSION_COOKIE}=;`);
    expect(setCookie).toContain("Max-Age=0");
    expect((await app.handle(withCookie("/api/auth/me"))).status).toBe(401);
  });
});

describe("POST /api/auth/password (FR-AUTH-07)", () => {
  it("given the correct current password, when changed, then 204 and the repo update is recorded", async () => {
    const repo = makeRepo(users);
    const app = createApp({ repo: repo.repo, audit, isTeamSupervisor });
    const res = await login(app, { identifier: "sayed", password: PASSWORD });
    cookieValue = res.headers.get("set-cookie")!.split(";")[0]!.split("=")[1]!;
    const out = await app.handle(
      withCookie("/api/auth/password", "POST", {
        current: PASSWORD,
        next: "N3w-Pass#1",
      }),
    );
    expect(out.status).toBe(204);
  });

  it("given a wrong current password, when changed, then 422 VALIDATION_FAILED naming the field", async () => {
    const app = build();
    const res = await login(app, { identifier: "sayed", password: PASSWORD });
    cookieValue = res.headers.get("set-cookie")!.split(";")[0]!.split("=")[1]!;
    const out = await app.handle(
      withCookie("/api/auth/password", "POST", {
        current: "wrong",
        next: "N3w-Pass#1",
      }),
    );
    expect(out.status).toBe(422);
    const body = await out.json();
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.details.field).toBe("current");
  });
});
