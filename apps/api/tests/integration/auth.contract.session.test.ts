// Row 10 TEST (3/3) — the sessioned routes' contract (§10.6 rows 2-4):
// /me, /logout, /password behind the auth guard over the real composition
// root. Guard rejections are the §10.4 envelope; success bodies validate
// against @sharq/schemas; logout revokes at DB level; a password change
// really swaps the stored hash. Two live sessions keep the specs
// independent: cookieA is the logout victim, cookieB survives for /me and
// /password.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { AuthUserBody, ChangePasswordBody } from "@sharq/schemas";
import type { App } from "../../src/app";
import { sha256Hex } from "../../src/modules/auth/token";
import { insertAuthUser, type AuthFixture } from "./auth.helpers";
import {
  apiCall,
  assertSchema,
  cookieValueFrom,
  createIntegrationApp,
  expectEnvelope,
} from "./contract.helpers";
import { startTestDb, type TestDb } from "./helpers";

let t: TestDb;
let app: App;
let user: AuthFixture;
let cookieA: string;
let cookieB: string;
const PASSWORD = "Contract-Session#2026";
const NEXT = "N3w-Contract#1";

beforeAll(async () => {
  t = await startTestDb();
  app = createIntegrationApp(t);
  user = await insertAuthUser(t.db, { password: PASSWORD });
  const login = async () =>
    cookieValueFrom(
      await apiCall(app, "/api/auth/login", {
        method: "POST",
        body: { identifier: user.username, password: PASSWORD },
      }),
    );
  cookieA = await login();
  cookieB = await login();
}, 60_000);

afterAll(() => t.stop(), 30_000);

describe("FR-AUTH-01 · GET /api/auth/me", () => {
  it("given no cookie, when hit, then 401 AUTH_REQUIRED in the §10.4 envelope", async () => {
    await expectEnvelope(await apiCall(app, "/api/auth/me"), "AUTH_REQUIRED");
  });

  it("given an unknown token, when hit, then 401 AUTH_REQUIRED", async () => {
    await expectEnvelope(
      await apiCall(app, "/api/auth/me", { cookie: "never-issued" }),
      "AUTH_REQUIRED",
    );
  });

  it("given a live session, when hit, then 200 with a schema-valid {user} equal to the session owner", async () => {
    const res = await apiCall(app, "/api/auth/me", { cookie: cookieB });
    expect(res.status).toBe(200);
    const parsed = (await res.json()) as {
      user: { id: string; mustChangePassword: boolean; role: string };
    };
    assertSchema(AuthUserBody, parsed);
    expect(parsed.user.id).toBe(user.id);
    expect(parsed.user.role).toBe("employee");
    expect(parsed.user.mustChangePassword).toBe(false);
  });
});

describe("FR-AUTH-02 · POST /api/auth/logout", () => {
  it("given no cookie, when posted, then 401 AUTH_REQUIRED", async () => {
    await expectEnvelope(
      await apiCall(app, "/api/auth/logout", { method: "POST" }),
      "AUTH_REQUIRED",
    );
  });

  it("given a live session, when posted, then 204 with an empty body and a cleared §10.2 cookie", async () => {
    const res = await apiCall(app, "/api/auth/logout", {
      method: "POST",
      cookie: cookieA,
    });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toContain("sharq_session=;");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
  });

  it("given the logged-out token, when its session row is queried, then revoked_at is set", async () => {
    const rows = await t.query<{ revoked_at: Date | null }[]>`
      select revoked_at from sessions where token_hash = ${sha256Hex(cookieA)}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.revoked_at).not.toBeNull();
  });

  it("given the logged-out cookie, when /me is hit again, then 401 AUTH_REQUIRED", async () => {
    await expectEnvelope(
      await apiCall(app, "/api/auth/me", { cookie: cookieA }),
      "AUTH_REQUIRED",
    );
  });
});

describe("FR-AUTH-07 · POST /api/auth/password", () => {
  it("given no cookie, when posted, then 401 AUTH_REQUIRED", async () => {
    await expectEnvelope(
      await apiCall(app, "/api/auth/password", {
        method: "POST",
        body: { current: "x", next: "y" },
      }),
      "AUTH_REQUIRED",
    );
  });

  it("given a body missing next, when posted with a session, then 422 VALIDATION_FAILED (request-schema branch, not wrong-current)", async () => {
    await expectEnvelope(
      await apiCall(app, "/api/auth/password", {
        method: "POST",
        cookie: cookieB,
        body: { current: PASSWORD },
      }),
      "VALIDATION_FAILED",
    );
  });

  it("given a wrong current password, when posted, then 422 VALIDATION_FAILED naming details.field = current", async () => {
    const env = await expectEnvelope(
      await apiCall(app, "/api/auth/password", {
        method: "POST",
        cookie: cookieB,
        body: { current: "wrong-current", next: NEXT },
      }),
      "VALIDATION_FAILED",
    );
    expect(env.error.details).toEqual({ field: "current" });
  });

  it("given the published ChangePasswordBody with the correct current password, when posted, then 204 empty and the new password really logs in", async () => {
    const body = { current: PASSWORD, next: NEXT };
    assertSchema(ChangePasswordBody, body); // the wire request IS the published schema
    const res = await apiCall(app, "/api/auth/password", {
      method: "POST",
      cookie: cookieB,
      body,
    });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    await expectEnvelope(
      await apiCall(app, "/api/auth/login", {
        method: "POST",
        body: { identifier: user.username, password: PASSWORD },
      }),
      "AUTH_REQUIRED",
    );
    const newLogin = await apiCall(app, "/api/auth/login", {
      method: "POST",
      body: { identifier: user.username, password: NEXT },
    });
    expect(newLogin.status).toBe(200);
  });
});
