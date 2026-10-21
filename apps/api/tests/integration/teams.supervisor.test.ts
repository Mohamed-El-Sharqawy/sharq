// FR-ADM-02 + EC-09 over real Postgres (roadmap row 3): replacing the
// supervisor flips teams.supervisor_id, and the teamScope guard's input —
// auth repo's isTeamSupervisor — flips with it with NO extra teardown;
// the old supervisor stays active (personal portal access untouched, EC-09)
// and the change is audited with old/new at the DB level.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createDrizzleAudit } from "../../src/lib/audit";
import { createDrizzleAuthRepo } from "../../src/modules/auth/repository";
import { createDrizzleMembershipsRepo } from "../../src/modules/teams/membership-repository";
import { createDrizzleTeamsRepo } from "../../src/modules/teams/repository";
import { createTeamsService } from "../../src/modules/teams/service";
import { createDrizzleUsersRepo } from "../../src/modules/users/repository";
import { insertAuthUser } from "./auth.helpers";
import { startTestDb, type TestDb } from "./helpers";

let db: TestDb;
const NOW = new Date("2026-10-19T10:00:00Z");
let ADMIN: string; // a real user row — audit_log.actor_id has an FK to users
let teamId: string;
let supA: string;
let supB: string;

beforeAll(async () => {
  db = await startTestDb();
  // The admin goes through insertAuthUser so ONE username counter owns this
  // container — helpers.insertUser keeps its own seq and would collide.
  ADMIN = (await insertAuthUser(db.db, { password: "admin-pw", role: "admin" }))
    .id;
  const a = await insertAuthUser(db.db, {
    password: "sup-a-pw",
    role: "supervisor",
  });
  const b = await insertAuthUser(db.db, {
    password: "sup-b-pw",
    role: "supervisor",
  });
  supA = a.id;
  supB = b.id;
  const svc = createTeamsService({
    teams: createDrizzleTeamsRepo(db.db),
    memberships: createDrizzleMembershipsRepo(db.db),
    users: createDrizzleUsersRepo(db.db),
    audit: createDrizzleAudit(db.db),
  });
  const team = await svc.createTeam({
    actorId: ADMIN,
    nameAr: "فريق الإشراف",
    supervisorId: supA,
  });
  if (!team.ok) throw new Error("fixture team create failed");
  teamId = team.team.id;
});
afterAll(() => db.stop());

describe("FR-ADM-02 · supervisor replacement drops team access (EC-09)", () => {
  it("given a team supervised by A, when replaced with B, then the row flips and the guard input (isTeamSupervisor) flips with it", async () => {
    const auth = createDrizzleAuthRepo(db.db);
    const svc = createTeamsService({
      teams: createDrizzleTeamsRepo(db.db),
      memberships: createDrizzleMembershipsRepo(db.db),
      users: createDrizzleUsersRepo(db.db),
      audit: createDrizzleAudit(db.db),
    });
    expect(await auth.isTeamSupervisor(supA, teamId)).toBe(true);
    const replaced = await svc.updateTeam(
      { actorId: ADMIN, teamId, patch: { supervisorId: supB }, version: 1 },
      NOW,
    );
    if (!replaced.ok) throw new Error(`expected ok, got ${replaced.code}`);
    expect(replaced.team.supervisorId).toBe(supB);
    expect(await auth.isTeamSupervisor(supA, teamId)).toBe(false);
    expect(await auth.isTeamSupervisor(supB, teamId)).toBe(true);
  });

  it("given the replacement, when the old supervisor is inspected, then he is still active (portal access kept) and teams.update carries old/new", async () => {
    const row = await db.query`
      select is_active from users where id = ${supA}`;
    expect(row[0]?.is_active).toBe(true);
    const audits = await db.query`
      select old_value, new_value from audit_log
      where action = 'teams.update' and entity_id = ${teamId}`;
    expect(audits).toHaveLength(1);
    expect(audits[0]?.old_value).toMatchObject({ supervisorId: supA });
    expect(audits[0]?.new_value).toMatchObject({ supervisorId: supB });
  });
});
