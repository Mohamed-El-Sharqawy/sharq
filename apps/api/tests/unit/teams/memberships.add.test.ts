// FR-ADM-03 — add member effective-dated (roadmap row 1, service units):
// a mid-week join stores the row at valid_from D with no end; the guards
// fail closed BEFORE any write reaches the repo (mocked ports, §4.2).
import { describe, expect, it } from "bun:test";
import { addMember } from "../../../src/modules/teams/memberships";
import { membershipService } from "./doubles";
import { MID_WEEK, makeTeam, makeUser } from "./helpers";

const adminId = "admin-1";

describe("FR-ADM-03 · add member effective-dated (mid-week join)", () => {
  it("given a live employee and a team, when added from mid-week D, then the row starts at D with no end, the create is audited, and nothing else is written", async () => {
    const team = makeTeam();
    const user = makeUser();
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [],
    });
    const result = await addMember(svc.deps, {
      actorId: adminId,
      teamId: team.id,
      userId: user.id,
      validFrom: MID_WEEK,
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.membership.teamId).toBe(team.id);
    expect(result.membership.validFrom).toBe(MID_WEEK);
    expect(result.membership.validTo).toBeNull();
    expect(result.membership.version).toBe(1);
    expect(result.transferredFromTeamId).toBeNull();
    expect(svc.calls.inserted).toHaveLength(1);
    expect(svc.calls.ended).toHaveLength(0);
    expect(svc.calls.txOpened).toBe(0);
    expect(svc.audit.entries).toHaveLength(1);
    expect(svc.audit.entries[0]).toMatchObject({
      action: "memberships.create",
      entityType: "membership",
      entityId: result.membership.id,
      actorId: adminId,
      oldValue: null,
      newValue: { teamId: team.id, validFrom: MID_WEEK, validTo: null },
    });
  });
});

describe("FR-ADM-03 · add member guards", () => {
  it("given an unknown team, when added, then TEAM_NOT_FOUND with no write and no audit", async () => {
    const user = makeUser();
    const svc = membershipService({
      teams: [],
      users: [user],
      memberships: [],
    });
    const result = await addMember(svc.deps, {
      actorId: adminId,
      teamId: crypto.randomUUID(),
      userId: user.id,
      validFrom: MID_WEEK,
    });
    expect(result).toEqual({ ok: false, code: "TEAM_NOT_FOUND" });
    expect(svc.calls.inserted).toHaveLength(0);
    expect(svc.audit.entries).toHaveLength(0);
  });

  it("given an unknown user, when added, then USER_NOT_FOUND with no write and no audit", async () => {
    const team = makeTeam();
    const svc = membershipService({
      teams: [team],
      users: [],
      memberships: [],
    });
    const result = await addMember(svc.deps, {
      actorId: adminId,
      teamId: team.id,
      userId: crypto.randomUUID(),
      validFrom: MID_WEEK,
    });
    expect(result).toEqual({ ok: false, code: "USER_NOT_FOUND" });
    expect(svc.calls.inserted).toHaveLength(0);
    expect(svc.audit.entries).toHaveLength(0);
  });

  it("given a deactivated user, when added, then INACTIVE_USER with no write and no audit", async () => {
    const team = makeTeam();
    const user = makeUser({ isActive: false });
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [],
    });
    const result = await addMember(svc.deps, {
      actorId: adminId,
      teamId: team.id,
      userId: user.id,
      validFrom: MID_WEEK,
    });
    expect(result).toEqual({ ok: false, code: "INACTIVE_USER" });
    expect(svc.calls.inserted).toHaveLength(0);
    expect(svc.audit.entries).toHaveLength(0);
  });
});
