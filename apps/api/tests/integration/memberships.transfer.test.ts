// FR-ADM-05 + EC-08/11 over real Postgres (roadmap row 3): the transfer
// bundle (close A at D−1, open B at D) lands as two real rows; overlap
// requests surface as the §10.4 duplicate code (the 409 carrier) — the
// boundary day by the service's inclusive pre-check, and a reopen that
// would double-book by the REAL exclusion constraint (23P01 → OVERLAP →
// DUPLICATE), with the failed bundle proven rolled back.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createDrizzleAudit } from "../../src/lib/audit";
import {
  addMember,
  updateMember,
  type MembershipDeps,
} from "../../src/modules/teams/memberships";
import { createDrizzleMembershipsRepo } from "../../src/modules/teams/membership-repository";
import { createDrizzleTeamsRepo } from "../../src/modules/teams/repository";
import { createDrizzleUsersRepo } from "../../src/modules/users/repository";
import { insertAuthUser, type AuthFixture } from "./auth.helpers";
import { addMembership, insertTeam, startTestDb, type TestDb } from "./helpers";

let db: TestDb;
let ADMIN: string; // a real user row — audit_log.actor_id has an FK to users
let svc: MembershipDeps;
let teamA: string;
let teamB: string;
let emp1: AuthFixture; // open in A → transfer
let emp2: AuthFixture; // closed [10-01..10-10] in A → boundary/mid-range
let emp3: AuthFixture; // closed [10-01..10-10] in A + open in B → reopen

beforeAll(async () => {
  db = await startTestDb();
  // The admin goes through insertAuthUser so ONE username counter owns this
  // container — helpers.insertUser keeps its own seq and would collide.
  ADMIN = (await insertAuthUser(db.db, { password: "admin-pw", role: "admin" }))
    .id;
  svc = {
    teams: createDrizzleTeamsRepo(db.db),
    memberships: createDrizzleMembershipsRepo(db.db),
    users: createDrizzleUsersRepo(db.db),
    audit: createDrizzleAudit(db.db),
  };
  teamA = await insertTeam(db.db);
  teamB = await insertTeam(db.db);
  emp1 = await insertAuthUser(db.db, { password: "pw-1" });
  emp2 = await insertAuthUser(db.db, { password: "pw-2" });
  emp3 = await insertAuthUser(db.db, { password: "pw-3" });
  await addMembership(db.db, {
    teamId: teamA,
    userId: emp1.id,
    validFrom: "2026-10-01",
    validTo: null,
  });
  await addMembership(db.db, {
    teamId: teamA,
    userId: emp2.id,
    validFrom: "2026-10-01",
    validTo: "2026-10-10",
  });
  await addMembership(db.db, {
    teamId: teamA,
    userId: emp3.id,
    validFrom: "2026-10-01",
    validTo: "2026-10-10",
  });
  await addMembership(db.db, {
    teamId: teamB,
    userId: emp3.id,
    validFrom: "2026-10-11",
    validTo: null,
  });
});
afterAll(() => db.stop());

describe("FR-ADM-05 · transfer closes A and opens B over real Postgres", () => {
  it("given an employee open in A, when added to B from mid-week D, then A stores D−1 and B opens at D — two real rows from one bundle", async () => {
    const result = await addMember(svc, {
      actorId: ADMIN,
      teamId: teamB,
      userId: emp1.id,
      validFrom: "2026-10-14",
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.transferredFromTeamId).toBe(teamA);
    const rows = await db.query`
      select team_id, valid_from::text, valid_to::text from team_memberships
      where user_id = ${emp1.id} order by valid_from`;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      team_id: teamA,
      valid_from: "2026-10-01",
      valid_to: "2026-10-13",
    });
    expect(rows[1]).toEqual({
      team_id: teamB,
      valid_from: "2026-10-14",
      valid_to: null,
    });
  });
});

describe("EC-08/EC-11 · overlapping membership requests map to the 409 code", () => {
  it("given a membership closed at E, when added on the boundary day E itself, then DUPLICATE comes from the pre-check and nothing is written", async () => {
    const result = await addMember(svc, {
      actorId: ADMIN,
      teamId: teamB,
      userId: emp2.id,
      validFrom: "2026-10-10",
    });
    expect(result).toEqual({ ok: false, code: "DUPLICATE" });
    const rows = await db.query`
      select id from team_memberships where user_id = ${emp2.id}`;
    expect(rows).toHaveLength(1);
  });

  it("given a closed range still covering D, when joined mid-range, then DUPLICATE (EC-11)", async () => {
    const result = await addMember(svc, {
      actorId: ADMIN,
      teamId: teamB,
      userId: emp2.id,
      validFrom: "2026-10-05",
    });
    expect(result).toEqual({ ok: false, code: "DUPLICATE" });
  });

  it("given a reopen that would double-book, when ended membership is reopened, then the REAL exclusion fires and the row is unchanged (rolled back)", async () => {
    const target = await db.query`
      select id from team_memberships
      where user_id = ${emp3.id} and team_id = ${teamA}`;
    const membershipId = target[0]?.id as string;
    const reopened = await updateMember(svc, {
      actorId: ADMIN,
      teamId: teamA,
      membershipId,
      version: 1, // validTo omitted → reopen to null
    });
    expect(reopened).toEqual({ ok: false, code: "DUPLICATE" });
    const after = await db.query`
      select valid_to::text from team_memberships where id = ${membershipId}`;
    expect(after[0]?.valid_to).toBe("2026-10-10");
  });
});
