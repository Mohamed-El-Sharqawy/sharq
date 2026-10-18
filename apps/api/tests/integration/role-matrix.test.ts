// Row 11 — the role-matrix harness runner (TESTING §7): drives every
// role-matrix.data row against the real composition root over real Postgres,
// one probe per actor. 401/403 expectations additionally assert the §10.4
// envelope (AUTH_REQUIRED / AUTH_FORBIDDEN) so a bare status change can't
// sneak past. Actor fixtures per TESTING §7's five-actor column: an
// employee, two supervisors each owning a team (the scope boundary), an
// admin, and the anonymous caller.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { App } from "../../src/app";
import { insertAuthUser, type AuthFixture } from "./auth.helpers";
import {
  apiCall,
  createIntegrationApp,
  expectEnvelope,
} from "./contract.helpers";
import {
  ACTORS,
  expectedFor,
  MATRIX,
  type Actor,
  type Credentials,
  type MatrixRow,
} from "./role-matrix.data";
import { startTestDb, type TestDb } from "./helpers";

const PASSWORD = "Matrix-Actor#2026";

let t: TestDb;
let app: App;
let employee: AuthFixture;
let supervisor: AuthFixture;
let otherSupervisor: AuthFixture;
let admin: AuthFixture;
/** Session cookie per actor; anonymous has none. */
const cookies: Partial<Record<Actor, string>> = {};

const actorUser: Record<Exclude<Actor, "anonymous">, () => AuthFixture> = {
  employee: () => employee,
  supervisorOwn: () => supervisor,
  supervisorOther: () => otherSupervisor,
  admin: () => admin,
};

/** Login probes use real credentials — the matrix holds the admin's (any
 * valid credentials satisfy the public login route). */
const credsFor = (actor: Actor): Credentials =>
  actor === "anonymous"
    ? { username: admin.username, password: PASSWORD }
    : { username: actorUser[actor]().username, password: PASSWORD };

const loginAs = async (actor: Actor, username: string) => {
  const res = await apiCall(app, "/api/auth/login", {
    method: "POST",
    body: { identifier: username, password: PASSWORD },
  });
  if (res.status !== 200) throw new Error(`actor ${actor} could not log in`);
  cookies[actor] = res.headers.get("set-cookie")!.split(";")[0]!.split("=")[1]!;
};

beforeAll(async () => {
  t = await startTestDb();
  app = createIntegrationApp(t);
  employee = await insertAuthUser(t.db, { password: PASSWORD });
  supervisor = await insertAuthUser(t.db, {
    password: PASSWORD,
    role: "supervisor",
  });
  otherSupervisor = await insertAuthUser(t.db, {
    password: PASSWORD,
    role: "supervisor",
  });
  admin = await insertAuthUser(t.db, { password: PASSWORD, role: "admin" });
  // The scope boundary: each supervisor owns exactly one team.
  await t.query`
    insert into teams (id, name_ar, supervisor_id)
    values (gen_random_uuid(), 'matrix-a', ${supervisor.id})`;
  await t.query`
    insert into teams (id, name_ar, supervisor_id)
    values (gen_random_uuid(), 'matrix-b', ${otherSupervisor.id})`;
  await loginAs("employee", employee.username);
  await loginAs("supervisorOwn", supervisor.username);
  await loginAs("supervisorOther", otherSupervisor.username);
  await loginAs("admin", admin.username);
}, 60_000);

afterAll(() => t.stop(), 30_000);

/** `:param` segments become a nil uuid — planned rows 404 regardless, and a
 * live guard rejects before any entity lookup. Rows needing real entities
 * extend this when they flip live. */
const fillPath = (path: string) =>
  path
    .split("/")
    .map((s) =>
      s.startsWith(":") ? "00000000-0000-0000-0000-000000000000" : s,
    )
    .join("/");

describe("§3 × §10.6 role matrix", () => {
  for (const row of MATRIX) {
    it(`${row.method} ${row.path}${row.fr ? ` · FR-${row.fr}` : ""}`, async () => {
      const expected = expectedFor(row);
      for (const actor of ACTORS) {
        const res = await apiCall(app, fillPath(row.path), {
          method: row.method,
          cookie: cookies[actor],
          body: row.bodyFor ? row.bodyFor(credsFor(actor)) : row.body,
        });
        if (res.status !== expected[actor])
          throw new Error(
            `actor ${actor}: expected HTTP ${expected[actor]}, got ${res.status}`,
          );
        if (expected[actor] === 401) await expectEnvelope(res, "AUTH_REQUIRED");
        else if (expected[actor] === 403)
          await expectEnvelope(res, "AUTH_FORBIDDEN");
      }
    });
  }

  it("matrix completeness · every §10.6 inventory row has a probe", () => {
    expect(MATRIX).toHaveLength(49);
  });
});
