// FR-ADM-05 — transfer (roadmap row 1, service units): adding an employee
// who is open in team A to team B from D closes A at D−1 and opens B at D
// inside ONE transaction; a lost version race on the close aborts BOTH
// writes; the tx's own OVERLAP backstop surfaces as DUPLICATE. The
// inverted-range date guard lives in memberships.transfer-guards.test.ts.
import { describe, expect, it } from "bun:test";
import { addMember } from "../../../src/modules/teams/memberships";
import { membershipService } from "./doubles";
import {
  DAY_BEFORE,
  EARLIER,
  MID_WEEK,
  makeMembership,
  makeTeam,
  makeUser,
} from "./helpers";

const adminId = "admin-1";

describe("FR-ADM-05 · transfer closes A and opens B in one transaction", () => {
  it("given an employee open in team A, when added to team B from mid-week D, then A closes at D−1 and B opens at D inside one tx, audited as a transfer", async () => {
    const teamA = makeTeam({ nameAr: "الفريق أ" });
    const teamB = makeTeam({ nameAr: "الفريق ب" });
    const user = makeUser();
    const open = makeMembership({
      teamId: teamA.id,
      userId: user.id,
      validFrom: EARLIER,
    });
    const svc = membershipService({
      teams: [teamA, teamB],
      users: [user],
      memberships: [open],
    });
    const result = await addMember(svc.deps, {
      actorId: adminId,
      teamId: teamB.id,
      userId: user.id,
      validFrom: MID_WEEK,
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.transferredFromTeamId).toBe(teamA.id);
    expect(result.membership.teamId).toBe(teamB.id);
    expect(result.membership.validFrom).toBe(MID_WEEK);
    expect(svc.calls.txOpened).toBe(1);
    expect(svc.calls.ended).toEqual([
      { id: open.id, validTo: DAY_BEFORE, expectedVersion: 1, inTx: true },
    ]);
    expect(svc.calls.inserted).toEqual([
      {
        input: { teamId: teamB.id, userId: user.id, validFrom: MID_WEEK },
        inTx: true,
      },
    ]);
    expect(svc.audit.entries).toHaveLength(1);
    expect(svc.audit.entries[0]).toMatchObject({
      action: "memberships.transfer",
      entityId: result.membership.id,
      actorId: adminId,
      oldValue: { id: open.id, teamId: teamA.id, validTo: null },
      newValue: { teamId: teamB.id, validFrom: MID_WEEK },
    });
  });
});

describe("FR-ADM-05 · transfer version race", () => {
  it("given the close loses a version race, when transferred, then CONFLICT_VERSION and the insert never happens (both writes abort)", async () => {
    const teamA = makeTeam();
    const teamB = makeTeam();
    const user = makeUser();
    const open = makeMembership({ teamId: teamA.id, userId: user.id });
    const svc = membershipService({
      teams: [teamA, teamB],
      users: [user],
      memberships: [open],
      knobs: { endWith: "VERSION_CONFLICT" },
    });
    const result = await addMember(svc.deps, {
      actorId: adminId,
      teamId: teamB.id,
      userId: user.id,
      validFrom: MID_WEEK,
    });
    expect(result).toEqual({ ok: false, code: "CONFLICT_VERSION" });
    expect(svc.calls.txOpened).toBe(1);
    expect(svc.calls.ended).toHaveLength(1);
    expect(svc.calls.inserted).toHaveLength(0);
    expect(svc.audit.entries).toHaveLength(0);
  });

  it("given the open insert inside the tx hits the exclusion backstop, when transferred, then OVERLAP surfaces as DUPLICATE with no audit", async () => {
    const teamA = makeTeam();
    const teamB = makeTeam();
    const user = makeUser();
    const open = makeMembership({ teamId: teamA.id, userId: user.id });
    const svc = membershipService({
      teams: [teamA, teamB],
      users: [user],
      memberships: [open],
      knobs: { insertWith: "OVERLAP" },
    });
    const result = await addMember(svc.deps, {
      actorId: adminId,
      teamId: teamB.id,
      userId: user.id,
      validFrom: MID_WEEK,
    });
    expect(result).toEqual({ ok: false, code: "DUPLICATE" });
    expect(svc.calls.inserted).toHaveLength(1);
    expect(svc.audit.entries).toHaveLength(0);
  });
});
