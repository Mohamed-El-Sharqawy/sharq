// Row 9 — the auth plugin (§10.6 auth rows) driven through createApp over
// mocked ports: cookie issue/clear per §10.2, generic login failure,
// lockout → 429, envelope-shaped errors incl. validation (§10.4 skeleton;
// Arabic map is row 12). Real-DB wiring is row 10's contract suite.
import { beforeAll, describe, expect, it } from "bun:test";
import { SESSION_COOKIE } from "../../../src/lib/guard";
import {
  PASSWORD,
  buildApp,
  cookieFrom,
  json,
  login,
  makeAdmin,
  type ErrBody,
  type UserBody,
} from "./helpers";

let admin: Awaited<ReturnType<typeof makeAdmin>>;
let cookieValue: string;

beforeAll(async () => {
  admin = await makeAdmin();
});

describe("POST /api/auth/login", () => {
  it("given valid credentials, when submitted, then 200 with the user and an httpOnly SameSite=Lax session cookie", async () => {
    const res = await login(buildApp(admin), {
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
    cookieValue = cookieFrom(res);
    const body = await json<UserBody>(res);
    expect(body.user.username).toBe("sayed");
    expect(body.user.displayNameAr).toBe("سيد");
    expect(body.user).not.toHaveProperty("passwordHash");
  });

  it("given secureCookies, when login succeeds, then the cookie carries Secure (prod)", async () => {
    const res = await login(buildApp(admin, true), {
      identifier: "sayed",
      password: PASSWORD,
    });
    expect(res.headers.get("set-cookie")).toContain("Secure");
  });

  it("given wrong credentials, when submitted, then 401 with the generic AUTH_REQUIRED envelope", async () => {
    const res = await login(buildApp(admin), {
      identifier: "sayed",
      password: "wrong",
    });
    expect(res.status).toBe(401);
    expect((await json<ErrBody>(res)).error.code).toBe("AUTH_REQUIRED");
  });

  it("given a malformed body, when submitted, then 422 VALIDATION_FAILED in the §10.4 envelope", async () => {
    const res = await login(buildApp(admin), { identifier: "sayed" });
    expect(res.status).toBe(422);
    expect((await json<ErrBody>(res)).error.code).toBe("VALIDATION_FAILED");
  });

  it("given the 5th consecutive failure for one identifier, when submitted again, then 429 RATE_LIMITED with retryAfterSeconds", async () => {
    const app = buildApp(admin);
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
    const body = await json<ErrBody>(res);
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.meta?.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("GET /api/auth/me · POST /api/auth/logout", () => {
  it("given no session cookie, when /me is hit, then 401", async () => {
    const res = await buildApp(admin).handle(
      new Request("http://localhost/api/auth/me"),
    );
    expect(res.status).toBe(401);
  });

  it("given a login, when /me is hit with the cookie, then 200 with the session user", async () => {
    const app = buildApp(admin);
    cookieValue = cookieFrom(
      await login(app, { identifier: "sayed", password: PASSWORD }),
    );
    const me = await app.handle(
      new Request("http://localhost/api/auth/me", {
        headers: { cookie: `sharq_session=${cookieValue}` },
      }),
    );
    expect(me.status).toBe(200);
    expect((await json<UserBody>(me)).user.id).toBe(admin.id);
  });

  it("given a login, when logout is hit, then 204 with a cleared cookie and the token no longer resolves", async () => {
    const app = buildApp(admin);
    cookieValue = cookieFrom(
      await login(app, { identifier: "sayed", password: PASSWORD }),
    );
    const out = await app.handle(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: { cookie: `sharq_session=${cookieValue}` },
      }),
    );
    expect(out.status).toBe(204);
    const setCookie = out.headers.get("set-cookie")!;
    expect(setCookie).toContain(`${SESSION_COOKIE}=;`);
    expect(setCookie).toContain("Max-Age=0");
    const after = await app.handle(
      new Request("http://localhost/api/auth/me", {
        headers: { cookie: `sharq_session=${cookieValue}` },
      }),
    );
    expect(after.status).toBe(401);
  });
});
