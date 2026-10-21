// FR-ADM-04 — end / reopen membership (roadmap row 1, service units):
// ending at E stores valid_to = E (the member's LAST day, inclusive);
// reopening stores null. Guards and race/scoping outcomes live in
// memberships.end-guards.test.ts.
import { describe, expect, it } from "bun:test";
import { updateMember } from "../../../src/modules/teams/memberships";
import { membershipService } from "./doubles";
import { LATER, makeMembership, makeTeam, makeUser } from "./helpers";

const adminId = "admin-1";

describe("FR-ADM-04 · end membership at E (E is the last day)", () => {
  it("given an open membership, when ended at E, then valid_to stores E, the version bumps, the update is audited with old/new, and no transaction opens", async () => {
    const team = makeTeam();
    const user = makeUser();
    const open = makeMembership({ teamId: team.id, userId: user.id });
    const svc = membershipService({
      teams: [team],
      users: [user],
      memberships: [open],
    });
    const result = await updateMember(svc.deps, {
      actorId: adminId,
      teamId: team.id,
      membershipId: open.id,
      validTo: LATER,
      version: 1,
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.membership.validTo).toBe(LATER);
    expect(result.membership.version).toBe(2);
    expect(svc.calls.ended).toEqual([
      { id: open.id, validTo: LATER, expectedVersion: 1, inTx: false },
    ]);
    expect(svc.calls.txOpened).toBe(0);
    expect(svc.audit.entries).toHaveLength(1);
    expect(svc.audit.entries[0]).toMatchObject({
      action: "memberships.update",
      entityId: open.id,
      actorId: adminId,
      oldValue: { validTo: null },
      newValue: { validTo: LATER },
    });
  });
});

describe("FR-ADM-04 · reopen membership", () => {
  it("given an ended membership, when updated with no validTo, then it reopens (valid_to back to null) and the reopen is audited", async () => {
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
    });
    const result = await updateMember(svc.deps, {
      actorId: adminId,
      teamId: team.id,
      membershipId: closed.id,
      version: 1,
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.membership.validTo).toBeNull();
    expect(svc.calls.ended[0]?.validTo).toBeNull();
    expect(svc.audit.entries[0]).toMatchObject({
      action: "memberships.update",
      oldValue: { validTo: LATER },
      newValue: { validTo: null },
    });
  });
});
