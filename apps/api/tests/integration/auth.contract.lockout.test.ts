// Row 10 TEST (2/3) — the login lockout contract over HTTP (§10.2 "lockout
// 5 fails → 15 min (audited)" surfacing as the §10.4 RATE_LIMITED 429 pair).
// Own container: the failure counter is per-identifier state inside one app
// instance, so the flow runs in order within this file only. The §10.6
// per-IP 10/min limiter is a second, separate layer (§10.7) — its wiring
// decision is logged in PROGRESS (lands with row 12's §10.7 cluster).
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { App } from "../../src/app";
import { insertAuthUser } from "./auth.helpers";
import {
  apiCall,
  createIntegrationApp,
  expectEnvelope,
} from "./contract.helpers";
import { startTestDb, type TestDb } from "./helpers";

let t: TestDb;
let app: App;
let username: string;
const PASSWORD = "Contract-Lock#2026";

const post = (password: string) =>
  apiCall(app, "/api/auth/login", {
    method: "POST",
    body: { identifier: username, password },
  });

beforeAll(async () => {
  t = await startTestDb();
  app = createIntegrationApp(t);
  username = (await insertAuthUser(t.db, { password: PASSWORD })).username;
}, 60_000);

afterAll(() => t.stop(), 30_000);

describe("§10.2 · login lockout 5 → 15 min (audited) over HTTP", () => {
  it("given 5 consecutive wrong passwords, when each is posted, then every attempt stays the generic 401", async () => {
    for (let i = 0; i < 5; i++) {
      await expectEnvelope(await post(`guess-${i}`), "AUTH_REQUIRED");
    }
  });

  it("given the armed lock, when the 6th attempt is posted, then 429 RATE_LIMITED with meta.retryAfterSeconds = 900", async () => {
    const env = await expectEnvelope(await post("guess-5"), "RATE_LIMITED");
    expect(env.error.meta).toEqual({ retryAfterSeconds: 900 });
  });

  it("given the armed lock, even the correct password, when posted, then it is still 429 (no bypass)", async () => {
    await expectEnvelope(await post(PASSWORD), "RATE_LIMITED");
  });

  it("given the whole flow, when audit_log and sessions are queried, then exactly one auth.lockout row exists and no session was ever created", async () => {
    const audits = await t.query<{ n: number }[]>`
      select count(*)::int as n from audit_log where action = 'auth.lockout'`;
    expect(audits[0]!.n).toBe(1);
    const sessions = await t.query<{ n: number }[]>`
      select count(*)::int as n from sessions`;
    expect(sessions[0]!.n).toBe(0);
  });
});
