// FR-ADM-05 — the transfer date guard (roadmap row 1, service units): a
// new start D at or before the open membership's own start is an inverted
// range (closing at D−1 would precede the start) — rejected BEFORE the
// transaction opens, so nothing is written and nothing is audited.
import { describe, expect, it } from "bun:test";
import { addMember } from "../../../src/modules/teams/memberships";
import { membershipService } from "./doubles";
import { EARLIER, makeMembership, makeTeam, makeUser } from "./helpers";

const adminId = "admin-1";

describe("FR-ADM-05 · transfer date guard", () => {
  it("given D equals the open membership's start, when transferred, then VALIDATION_FAILED on validFrom and no transaction opens", async () => {
    const teamA = makeTeam();
    const teamB = makeTeam();
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
      validFrom: EARLIER,
    });
    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      field: "validFrom",
    });
    expect(svc.calls.txOpened).toBe(0);
    expect(svc.calls.ended).toHaveLength(0);
    expect(svc.calls.inserted).toHaveLength(0);
  });

  it("given D before the open membership's start, when transferred, then VALIDATION_FAILED on validFrom (closing at D−1 would invert the range)", async () => {
    const teamA = makeTeam();
    const teamB = makeTeam();
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
      validFrom: "2026-09-15",
    });
    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      field: "validFrom",
    });
    expect(svc.calls.txOpened).toBe(0);
    expect(svc.audit.entries).toHaveLength(0);
  });
});
