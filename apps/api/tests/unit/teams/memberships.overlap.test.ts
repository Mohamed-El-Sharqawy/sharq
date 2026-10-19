// EC-08/EC-11 — the inclusive-day overlap math (roadmap row 1, service
// units): a day belongs to at most one team. Adjacency (join at E+1, or a
// rejoin after a gap) is legal; the boundary day E itself and mid-range
// joins are rejected. The repo-level "OVERLAP" (23P01 race backstop)
// surfaces as DUPLICATE with no audit.
import { describe, expect, it } from "bun:test";
import { addMember } from "../../../src/modules/teams/memberships";
import { membershipService } from "./doubles";
import {
  EARLIER,
  MID_WEEK,
  makeMembership,
  makeTeam,
  makeUser,
} from "./helpers";

const adminId = "admin-1";
const E = "2026-10-10"; // a closed membership's last day (inclusive)

function join(
  svc: ReturnType<typeof membershipService>,
  teamId: string,
  userId: string,
  validFrom: string,
) {
  return addMember(svc.deps, {
    actorId: adminId,
    teamId,
    userId,
    validFrom,
  });
}

describe("EC-08 · inclusive boundary math on join", () => {
  it("given a membership closed at E, when joined on E itself, then DUPLICATE — the boundary day is still double-booking", async () => {
    const team = makeTeam();
    const user = makeUser();
    const closed = makeMembership({
      teamId: team.id,
      userId: user.id,
      validFrom: EARLIER,
      validTo: E,
    });
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [closed],
    });
    const result = await join(svc, team.id, user.id, E);
    expect(result).toEqual({ ok: false, code: "DUPLICATE" });
    expect(svc.calls.inserted).toHaveLength(0);
  });

  it("given a membership closed at E, when joined on E+1, then the join inserts — adjacent ranges are legal", async () => {
    const team = makeTeam();
    const user = makeUser();
    const closed = makeMembership({
      teamId: team.id,
      userId: user.id,
      validFrom: EARLIER,
      validTo: E,
    });
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [closed],
    });
    const result = await join(svc, team.id, user.id, "2026-10-11");
    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.membership.validFrom).toBe("2026-10-11");
    expect(svc.calls.inserted).toHaveLength(1);
  });

  it("given history closed before D, when the same employee rejoins from D, then the join inserts — closed history never blocks a rejoin", async () => {
    const team = makeTeam();
    const user = makeUser();
    const closed = makeMembership({
      teamId: team.id,
      userId: user.id,
      validFrom: "2026-09-01",
      validTo: "2026-09-30",
    });
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [closed],
    });
    const result = await join(svc, team.id, user.id, MID_WEEK);
    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.membership.validFrom).toBe(MID_WEEK);
  });
});

describe("EC-11 · overlap rejection on join", () => {
  it("given an active membership in the team, when added again from any date, then DUPLICATE and nothing is written", async () => {
    const team = makeTeam();
    const user = makeUser();
    const open = makeMembership({ teamId: team.id, userId: user.id });
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [open],
    });
    const result = await join(svc, team.id, user.id, MID_WEEK);
    expect(result).toEqual({ ok: false, code: "DUPLICATE" });
    expect(svc.calls.inserted).toHaveLength(0);
    expect(svc.calls.txOpened).toBe(0);
  });

  it("given a closed range still covering D, when joined mid-range, then DUPLICATE", async () => {
    const team = makeTeam();
    const user = makeUser();
    const closed = makeMembership({
      teamId: team.id,
      userId: user.id,
      validFrom: EARLIER,
      validTo: "2026-10-31",
    });
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [closed],
    });
    const result = await join(svc, team.id, user.id, MID_WEEK);
    expect(result).toEqual({ ok: false, code: "DUPLICATE" });
    expect(svc.calls.inserted).toHaveLength(0);
  });

  it("given the DB backstop rejects the insert as a race, when added, then OVERLAP surfaces as DUPLICATE with no audit", async () => {
    const team = makeTeam();
    const user = makeUser();
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [],
      knobs: { insertWith: "OVERLAP" },
    });
    const result = await join(svc, team.id, user.id, MID_WEEK);
    expect(result).toEqual({ ok: false, code: "DUPLICATE" });
    expect(svc.calls.inserted).toHaveLength(1);
    expect(svc.audit.entries).toHaveLength(0);
  });
});
