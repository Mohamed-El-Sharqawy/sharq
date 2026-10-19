// Row 12 — §10.7 health endpoint (§10.6 last row): public, no session, DB
// round-trip check, {status, db, version} shape. 200 ok / 503 degraded.
import { describe, expect, it } from "bun:test";
import { createApp } from "../../../src/app";
import { makeAudit, makeRepo, makeUser } from "../auth/helpers";

const build = (dbUp: boolean) =>
  createApp({
    repo: makeRepo([makeUser()]).repo,
    audit: makeAudit(),
    isTeamSupervisor: async () => false,
    dbCheck: async () => dbUp,
  });

type HealthBody = { status: string; db: string; version: string };

describe("GET /api/health · public, no auth", () => {
  it("given a reachable DB, when probed, then 200 {status:ok, db:up, version}", async () => {
    const res = await build(true).handle(
      new Request("http://localhost/api/health"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as HealthBody;
    expect(body.status).toBe("ok");
    expect(body.db).toBe("up");
    expect(body.version).toBeTruthy();
  });

  it("given a failing DB check, when probed, then 503 {status:degraded, db:down}", async () => {
    const res = await build(false).handle(
      new Request("http://localhost/api/health"),
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as HealthBody;
    expect(body.status).toBe("degraded");
    expect(body.db).toBe("down");
  });

  it("needs no session cookie — an anonymous probe is not a 401 envelope", async () => {
    const res = await build(true).handle(
      new Request("http://localhost/api/health"),
    );
    expect(res.status).not.toBe(401);
  });
});
