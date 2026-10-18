// Row 12 — the §10.7 per-IP login limiter against the real composition
// (default bucket 10/min, no test override): the 11th request from one IP
// inside the window is a 429 RATE_LIMITED envelope, gated BEFORE the
// handler — so the service-level lockout never arms and no audit row is
// written for the blocked attempts. The two rate-limit layers (§10.2
// lockout 5/15min, §10.6 login 10/min/IP) stay independent.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createApp, type App } from "../../src/app";
import { createDrizzleAudit } from "../../src/lib/audit";
import { createDrizzleAuthRepo } from "../../src/modules/auth/repository";
import { insertAuthUser } from "./auth.helpers";
import { apiCall, expectEnvelope } from "./contract.helpers";
import { startTestDb, type TestDb } from "./helpers";

const PASSWORD = "Rate-Limit#2026";

let t: TestDb;
let app: App;
let username: string;

const garbageLogin = (n: number) =>
  apiCall(app, "/api/auth/login", {
    method: "POST",
    // Well-formed body for an unknown user: reaches the handler (401
    // generic), so the limiter COUNTS it; a unique identifier per call
    // keeps the service lockout counter at zero — the layers stay
    // independently assertable.
    body: { identifier: `rl-ghost-${n}`, password: "Whatever#1" },
  });

beforeAll(async () => {
  t = await startTestDb();
  const user = await insertAuthUser(t.db, { password: PASSWORD });
  username = user.username;
  // Default bucket (10/min) — the production shape; the shared helper's
  // high override exists so the OTHER suites never trip the limiter.
  const repo = createDrizzleAuthRepo(t.db);
  app = createApp({
    repo,
    audit: createDrizzleAudit(t.db),
    isTeamSupervisor: repo.isTeamSupervisor,
    dbCheck: async () => true,
  });
}, 60_000);

afterAll(() => t.stop(), 30_000);

describe("POST /api/auth/login · per-IP 10/min contract (§10.6/§10.7)", () => {
  it("given 10 requests from one IP, when the 11th arrives, then 429 RATE_LIMITED in the §10.4 envelope", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await garbageLogin(i)).status).toBe(401);
    }
    const res = await garbageLogin(99);
    await expectEnvelope(res, "RATE_LIMITED");
  });

  it("gates before the handler — valid credentials also 429, and no lockout audit row is written", async () => {
    const res = await apiCall(app, "/api/auth/login", {
      method: "POST",
      body: { identifier: username, password: PASSWORD },
    });
    await expectEnvelope(res, "RATE_LIMITED");
    const rows = await t.query`
      select count(*)::int as n from audit_log where action = 'auth.lockout'`;
    expect(rows[0]!.n).toBe(0);
  });
});
