// FR-ADM-04 — end/reopen guards (roadmap row 1, service units): E must not
// precede valid_from (a single day E = valid_from is legal), stale versions
// carry the current row back, the lookup is team-scoped, and the OVERLAP
// backstop (a reopen that would double-book) surfaces as DUPLICATE.
import { describe, expect, it } from "bun:test";
import { updateMember } from "../../../src/modules/teams/memberships";
import { membershipService } from "./doubles";
import { EARLIER, LATER, makeMembership, makeTeam, makeUser } from "./helpers";

const adminId = "admin-1";

describe("FR-ADM-04 · end date guards", () => {
  it("given E earlier than valid_from, when ended, then VALIDATION_FAILED on validTo and nothing is written", async () => {
    const team = makeTeam();
    const user = makeUser();
    const open = makeMembership({
      teamId: team.id,
      userId: user.id,
      validFrom: EARLIER,
    });
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [open],
    });
    const result = await updateMember(svc.deps, {
      actorId: adminId,
      teamId: team.id,
      membershipId: open.id,
      validTo: "2026-09-15",
      version: 1,
    });
    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      field: "validTo",
    });
    expect(svc.calls.ended).toHaveLength(0);
    expect(svc.audit.entries).toHaveLength(0);
  });

  it("given E equal to valid_from, when ended, then the single-day membership is accepted", async () => {
    const team = makeTeam();
    const user = makeUser();
    const open = makeMembership({
      teamId: team.id,
      userId: user.id,
      validFrom: EARLIER,
    });
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [open],
    });
    const result = await updateMember(svc.deps, {
      actorId: adminId,
      teamId: team.id,
      membershipId: open.id,
      validTo: EARLIER,
      version: 1,
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.membership.validTo).toBe(EARLIER);
  });
});

describe("FR-ADM-04 · end version & team-scope guards", () => {
  it("given a stale version, when ended, then CONFLICT_VERSION carries the current row", async () => {
    const team = makeTeam();
    const user = makeUser();
    const open = makeMembership({ teamId: team.id, userId: user.id });
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [open],
      knobs: { endWith: "VERSION_CONFLICT" },
    });
    const result = await updateMember(svc.deps, {
      actorId: adminId,
      teamId: team.id,
      membershipId: open.id,
      validTo: LATER,
      version: 1,
    });
    if (result.ok || result.code !== "CONFLICT_VERSION") {
      throw new Error("expected CONFLICT_VERSION");
    }
    expect(result.current.id).toBe(open.id);
    expect(result.current.validTo).toBeNull();
    expect(svc.audit.entries).toHaveLength(0);
  });

  it("given a membership id from another team, when ended, then NOT_FOUND (the lookup is team-scoped)", async () => {
    const teamA = makeTeam();
    const teamB = makeTeam();
    const user = makeUser();
    const open = makeMembership({ teamId: teamA.id, userId: user.id });
    const svc = membershipService({
      teams: [teamA, teamB],
      users: [user],
      memberships: [open],
    });
    const result = await updateMember(svc.deps, {
      actorId: adminId,
      teamId: teamB.id,
      membershipId: open.id,
      validTo: LATER,
      version: 1,
    });
    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(svc.calls.ended).toHaveLength(0);
  });
});

describe("FR-ADM-04 · end overlap backstop", () => {
  it("given the write would double-book (backstop), when updated, then OVERLAP surfaces as DUPLICATE with no audit", async () => {
    const team = makeTeam();
    const user = makeUser();
    const closed = makeMembership({
      teamId: team.id,
      userId: user.id,
      validTo: LATER,
    });
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [closed],
      knobs: { endWith: "OVERLAP" },
    });
    const result = await updateMember(svc.deps, {
      actorId: adminId,
      teamId: team.id,
      membershipId: closed.id,
      version: 1, // reopen (validTo omitted → null)
    });
    expect(result).toEqual({ ok: false, code: "DUPLICATE" });
    expect(svc.calls.ended).toHaveLength(1);
    expect(svc.audit.entries).toHaveLength(0);
  });
});
