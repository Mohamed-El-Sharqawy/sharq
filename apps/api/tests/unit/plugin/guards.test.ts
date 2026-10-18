// SPEC §10.2 — guard macros (`auth`, `role`, `teamScope`) driven through a
// real Elysia app over mocked ports (no DB): 401 for anonymous/unknown
// tokens, 403 for role/team-scope mismatches, `user` attached to context.
import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import {
  SESSION_COOKIE,
  createGuards,
  type GuardDeps,
} from "../../../src/lib/guard";
import type { AuthUser, AuthSession } from "../../../src/modules/auth/types";
import { json, type ErrBody } from "./helpers";

const T0 = new Date("2026-10-18T10:00:00Z");

const admin: AuthUser = {
  id: "u-admin",
  username: "sayed",
  phone: "+201000000001",
  displayNameAr: "سيد",
  role: "admin",
  isActive: true,
  mustChangePassword: false,
};
const supervisor: AuthUser = {
  ...admin,
  id: "u-super",
  username: "mohamed",
  role: "supervisor",
};

const deps = (
  sessionUser: AuthUser | null,
  supervisorOf: string[] = [],
): GuardDeps => ({
  resolveSession: async (token) => {
    if (!sessionUser || token !== "good-token") return null;
    const session: AuthSession = {
      id: "s1",
      userId: sessionUser.id,
      tokenHash: "hash",
      lastSeenAt: T0,
      expiresAt: new Date(T0.getTime() + 240 * 60_000),
      revokedAt: null,
    };
    return { user: sessionUser, session };
  },
  isTeamSupervisor: async (_userId, teamId) => supervisorOf.includes(teamId),
});

const app = (d: GuardDeps) =>
  new Elysia()
    .use(createGuards(d))
    .get("/probe/me", ({ user }) => user, { auth: true })
    .get("/probe/admin", () => "secret", { auth: true, role: "admin" })
    .get("/probe/team/:teamId", ({ params }) => params.teamId, {
      auth: true,
      teamScope: "teamId",
    })
    .get("/probe/teamq", ({ query }) => query.teamId, {
      auth: true,
      teamScope: "teamId",
    });

const req = (url: string, token?: string) =>
  new Request(`http://localhost${url}`, {
    headers: token ? { cookie: `${SESSION_COOKIE}=${token}` } : {},
  });

describe("§10.2 · guard.auth", () => {
  it("given no cookie, when a guarded route is hit, then 401 AUTH_REQUIRED (envelope shape)", async () => {
    const res = await app(deps(admin)).handle(req("/probe/me"));
    expect(res.status).toBe(401);
    const body = await json<ErrBody>(res);
    expect(body.error.code).toBe("AUTH_REQUIRED");
    // The Arabic message wiring is row 12 (SPEC §10.4) — shape only here.
    expect(typeof body.error.message).toBe("string");
  });

  it("given an unknown token, when a guarded route is hit, then 401 AUTH_REQUIRED", async () => {
    const res = await app(deps(admin)).handle(req("/probe/me", "nope"));
    expect(res.status).toBe(401);
  });

  it("given a live session, when a guarded route is hit, then the user is on the context (no passwordHash)", async () => {
    const res = await app(deps(admin)).handle(req("/probe/me", "good-token"));
    expect(res.status).toBe(200);
    const body = await json<{ username: string }>(res);
    expect(body.username).toBe("sayed");
    expect(body).not.toHaveProperty("passwordHash");
  });
});

describe("§10.2 · guard.role", () => {
  it("given an employee, when an admin-only route is hit, then 403 AUTH_FORBIDDEN", async () => {
    const res = await app(deps(supervisor)).handle(
      req("/probe/admin", "good-token"),
    );
    expect(res.status).toBe(403);
    expect((await json<ErrBody>(res)).error.code).toBe("AUTH_FORBIDDEN");
  });

  it("given the required role, when the route is hit, then 200", async () => {
    const res = await app(deps(admin)).handle(
      req("/probe/admin", "good-token"),
    );
    expect(res.status).toBe(200);
  });
});

describe("§10.2 · guard.teamScope", () => {
  it("given the admin, when any team route is hit, then 200 (admin bypasses scope)", async () => {
    const res = await app(deps(admin)).handle(
      req("/probe/team/t1", "good-token"),
    );
    expect(res.status).toBe(200);
  });

  it("given the supervisor of that team, when the route is hit, then 200", async () => {
    const res = await app(deps(supervisor, ["t1"])).handle(
      req("/probe/team/t1", "good-token"),
    );
    expect(res.status).toBe(200);
  });

  it("given a supervisor of a DIFFERENT team, when the route is hit, then 403 AUTH_FORBIDDEN", async () => {
    const res = await app(deps(supervisor, ["t2"])).handle(
      req("/probe/team/t1", "good-token"),
    );
    expect(res.status).toBe(403);
  });

  it("given no teamId in the request, when the scoped route is hit, then 403", async () => {
    const res = await app(deps(supervisor, ["t1"])).handle(
      req("/probe/teamq", "good-token"),
    );
    expect(res.status).toBe(403);
  });

  it("given a supervisor, when the teamId arrives via query, then the scope applies (200 own / 403 other)", async () => {
    const ok = await app(deps(supervisor, ["t9"])).handle(
      req("/probe/teamq?teamId=t9", "good-token"),
    );
    const no = await app(deps(supervisor, ["t9"])).handle(
      req("/probe/teamq?teamId=t8", "good-token"),
    );
    expect(ok.status).toBe(200);
    expect(no.status).toBe(403);
  });
});
