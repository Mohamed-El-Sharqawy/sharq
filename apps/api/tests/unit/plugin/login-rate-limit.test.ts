// Row 12 — §10.6/§10.7 login rate limit: 10/min/IP on POST /api/auth/login
// (bucket size injectable; the default-10 contract runs against the real
// composition in the integration suite). Schema-validation failures count
// (rejected before beforeHandle per the plugin's refund semantics), so
// garbage bodies exhaust the bucket without ever arming the service-level
// lockout — the two layers stay independently assertable.
import { describe, expect, it } from "bun:test";
import { API_ERROR_MESSAGES } from "@sharq/locales";
import { createApp } from "../../../src/app";
import { makeAudit, makeRepo, makeUser } from "../auth/helpers";

const build = (authPerMinute: number) =>
  createApp({
    repo: makeRepo([makeUser()]).repo,
    audit: makeAudit(),
    isTeamSupervisor: async () => false,
    dbCheck: async () => true,
    rateLimit: { authPerMinute },
  });

/** A well-formed login for an unknown user: passes validation, reaches the
 * handler, 401 generic — COUNTED by the limiter (validation-refunded
 * requests are not, per elysia-rate-limit 4.6.x semantics). A unique
 * identifier per call keeps the service-level lockout counter at zero so
 * the two layers stay independently assertable. */
const unknownLogin = (app: ReturnType<typeof createApp>, n: number) =>
  app.handle(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: `ghost-${n}`,
        password: "Whatever#1",
      }),
    }),
  );

describe("POST /api/auth/login · per-IP rate limit (§10.7)", () => {
  it("given a 2/min bucket, when a third request arrives, then 429 RATE_LIMITED with the Arabic envelope", async () => {
    const app = build(2);
    expect((await unknownLogin(app, 1)).status).toBe(401);
    expect((await unknownLogin(app, 2)).status).toBe(401);
    const res = await unknownLogin(app, 3);
    expect(res.status).toBe(429);
    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.message).toBe(API_ERROR_MESSAGES.RATE_LIMITED);
  });

  it("gates before the handler — even valid credentials 429 while the bucket is exhausted", async () => {
    const app = build(1);
    await unknownLogin(app, 1);
    const res = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: "sayed",
          password: "whatever#1",
        }),
      }),
    );
    expect(res.status).toBe(429);
  });

  it("scopes to the login route — /api/auth/me is not limited by the login bucket", async () => {
    const app = build(1);
    await unknownLogin(app, 1); // bucket exhausted
    const me = await app.handle(new Request("http://localhost/api/auth/me"));
    expect(me.status).toBe(401); // not 429 — different route entirely
  });
});
