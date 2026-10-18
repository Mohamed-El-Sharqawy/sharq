// Row 10 TEST (1/3) — the login contract (§10.6 row 1) over the real
// composition root (createApp + drizzle repo + src-side audit) on real
// Postgres: requests are the published LoginBody, success bodies validate
// against AuthUserBody, failures carry the §10.4 envelope with its fixed
// status (pair table in contract.helpers.ts), and each session lands in the
// table keyed by the SHA-256 of the cookie token. Message strings are never
// asserted (TEMP error-map — row 12 swaps in Arabic; codes are the contract).
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { AuthUserBody, LoginBody } from "@sharq/schemas";
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
const PASSWORD = "Contract-Login#2026";

const post = (body: unknown) =>
  apiCall(app, "/api/auth/login", { method: "POST", body });

const sessionCount = async () =>
  (
    await t.query<{ n: number }[]>`
      select count(*)::int as n from sessions where user_id = ${user.id}`
  )[0]!.n;

beforeAll(async () => {
  t = await startTestDb();
  app = createIntegrationApp(t);
  user = await insertAuthUser(t.db, { password: PASSWORD, role: "admin" });
}, 60_000);

afterAll(() => t.stop(), 30_000);

describe("FR-AUTH-01 · POST /api/auth/login — success contract", () => {
  it("given the published LoginBody shape with correct credentials, when posted, then 200 with a schema-valid {user} and no hash on the wire", async () => {
    const body = { identifier: user.username, password: PASSWORD };
    assertSchema(LoginBody, body); // the wire request IS the published schema
    const res = await post(body);
    expect(res.status).toBe(200);
    const parsed = (await res.json()) as { user: Record<string, unknown> };
    assertSchema(AuthUserBody, parsed); // closed object: a hash leak fails here
    expect(parsed.user.username).toBe(user.username);
    expect(parsed.user.id).toBe(user.id);
    expect(parsed.user).not.toHaveProperty("passwordHash");
  });

  it("given the phone number as the identifier, when posted, then the same 200 contract holds", async () => {
    const res = await post({ identifier: user.phone, password: PASSWORD });
    expect(res.status).toBe(200);
    assertSchema(AuthUserBody, await res.json());
  });

  it("given a successful login, when the Set-Cookie is inspected, then the §10.2 flags hold and the session cookie carries no Max-Age", async () => {
    const setCookie = (
      await post({
        identifier: user.username,
        password: PASSWORD,
      })
    ).headers.get("set-cookie")!;
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).not.toContain("Secure"); // prod wiring asserts Secure below
    expect(setCookie).not.toContain("Max-Age"); // session cookie; the server-side idle window governs lifetime
  });

  it("given the issued token, when the sessions table is queried, then a live row stores sha256(token)", async () => {
    const token = cookieValueFrom(
      await post({ identifier: user.username, password: PASSWORD }),
    );
    const rows = await t.query<
      { token_hash: string; revoked_at: Date | null }[]
    >`
      select token_hash, revoked_at from sessions
      where user_id = ${user.id} and token_hash = ${sha256Hex(token)}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.revoked_at).toBeNull();
  });
});

describe("§10.2 · cookie Secure flag in prod wiring", () => {
  it("given secureCookies:true, when login succeeds, then Set-Cookie carries Secure", async () => {
    const secure = createIntegrationApp(t, { secureCookies: true });
    const res = await apiCall(secure, "/api/auth/login", {
      method: "POST",
      body: { identifier: user.username, password: PASSWORD },
    });
    expect(res.headers.get("set-cookie")).toContain("Secure");
  });
});

describe("FR-AUTH-01/EC-25 · failures are generic 401 AUTH_REQUIRED", () => {
  it("given a wrong password, when posted, then the §10.4 envelope and no new session row", async () => {
    const before = await sessionCount();
    await expectEnvelope(
      await post({ identifier: user.username, password: "not-the-password" }),
      "AUTH_REQUIRED",
    );
    expect(await sessionCount()).toBe(before);
  });

  it("given an unknown identifier, when posted, then the envelope is byte-identical to the wrong-password one (no user enumeration)", async () => {
    const wrong = await expectEnvelope(
      await post({ identifier: user.username, password: "nope" }),
      "AUTH_REQUIRED",
    );
    const unknown = await expectEnvelope(
      await post({ identifier: "who-is-this", password: "nope" }),
      "AUTH_REQUIRED",
    );
    expect(JSON.stringify(unknown)).toBe(JSON.stringify(wrong));
  });
});

describe("§10.3/§10.4 · malformed login bodies → 422 VALIDATION_FAILED", () => {
  it("given a missing password, when posted, then the envelope pair holds", async () => {
    await expectEnvelope(
      await post({ identifier: user.username }),
      "VALIDATION_FAILED",
    );
  });

  it("given an empty identifier, when posted, then the envelope pair holds", async () => {
    await expectEnvelope(
      await post({ identifier: "", password: "x" }),
      "VALIDATION_FAILED",
    );
  });

  it("given a wrong-typed password (number), when posted, then the envelope pair holds", async () => {
    await expectEnvelope(
      await post({ identifier: user.username, password: 42 }),
      "VALIDATION_FAILED",
    );
  });

  it("given unparseable JSON, when posted, then the PARSE path maps to the same envelope", async () => {
    await expectEnvelope(await post("{not-json"), "VALIDATION_FAILED");
  });
});
