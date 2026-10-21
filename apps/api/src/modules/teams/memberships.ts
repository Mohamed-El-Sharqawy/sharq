// FR-ADM-03/04/05 — the effective-dated membership lifecycle. valid_to is
// INCLUSIVE (E is the member's last day): ending at E stores E; a transfer
// to team B from D closes A at D−1 and opens B at D inside ONE transaction
// (tx()). The service pre-checks overlap on inclusive day semantics — the
// DB exclusion (daterange [to) bounds) is only the backstop for races and
// mid-range inserts, mapped to DUPLICATE → 409 (EC-08/11). Every state
// change is audited (§15 old/new).
import type { UsersRepo } from "../users/service";
import type { AuditPort } from "../auth/types";
import { prevDay } from "./membership-dates";
import type {
  AddMemberInput,
  AddMemberResult,
  Membership,
  MembershipsRepo,
  TeamsRepo,
  UpdateMemberInput,
  UpdateMemberResult,
} from "./types";

export type MembershipDeps = {
  teams: TeamsRepo;
  memberships: MembershipsRepo;
  users: UsersRepo;
  audit: AuditPort;
};

export async function addMember(
  deps: MembershipDeps,
  input: AddMemberInput,
): Promise<AddMemberResult> {
  const team = await deps.teams.findTeam(input.teamId);
  if (!team) return { ok: false, code: "TEAM_NOT_FOUND" };
  const user = await deps.users.findUser(input.userId);
  if (!user) return { ok: false, code: "USER_NOT_FOUND" };
  if (!user.isActive) return { ok: false, code: "INACTIVE_USER" };

  const all = await deps.memberships.listByUser(input.userId);
  const open = all.find((m) => m.validTo === null);
  if (open && open.teamId === input.teamId) {
    return { ok: false, code: "DUPLICATE" }; // already an active member
  }
  if (open && open.teamId !== input.teamId) {
    return transfer(deps, input, open); // FR-ADM-05
  }
  if (conflictsAt(input.validFrom, all)) {
    return { ok: false, code: "DUPLICATE" }; // EC-08 boundary day / EC-11
  }

  const inserted = await deps.memberships.insertMembership({
    teamId: input.teamId,
    userId: input.userId,
    validFrom: input.validFrom,
  });
  if (inserted === "OVERLAP") return { ok: false, code: "DUPLICATE" };
  await auditMembership(deps, "memberships.create", {
    oldValue: null,
    newValue: inserted,
    actorId: input.actorId,
  });
  return { ok: true, membership: inserted, transferredFromTeamId: null };
}

/** FR-ADM-05 — close the open membership at D−1 and open the new one at D
 * atomically; a concurrent version bump on the old row aborts BOTH writes. */
async function transfer(
  deps: MembershipDeps,
  input: AddMemberInput,
  open: Membership,
): Promise<AddMemberResult> {
  if (input.validFrom <= open.validFrom) {
    // Closing at D−1 would precede the open membership's start: inverted
    // range, rejected before the transaction touches anything.
    return { ok: false, code: "VALIDATION_FAILED", field: "validFrom" };
  }
  const result = await deps.memberships.tx(async (tx) => {
    const closed = await tx.endMembership(
      open.id,
      prevDay(input.validFrom),
      open.version,
    );
    if (closed === "VERSION_CONFLICT") return closed;
    return tx.insertMembership({
      teamId: input.teamId,
      userId: input.userId,
      validFrom: input.validFrom,
    });
  });
  if (result === "VERSION_CONFLICT") {
    return { ok: false, code: "CONFLICT_VERSION" };
  }
  if (result === "OVERLAP") return { ok: false, code: "DUPLICATE" };
  await auditMembership(deps, "memberships.transfer", {
    oldValue: open,
    newValue: result,
    actorId: input.actorId,
  });
  return { ok: true, membership: result, transferredFromTeamId: open.teamId };
}

/** FR-ADM-04 — end (validTo = E, the member's LAST day) or reopen (null).
 * Reopening can re-create an overlap; the DB backstop maps it to DUPLICATE. */
export async function updateMember(
  deps: MembershipDeps,
  input: UpdateMemberInput,
): Promise<UpdateMemberResult> {
  const current = await deps.memberships.findMembership(
    input.teamId,
    input.membershipId,
  );
  if (!current) return { ok: false, code: "NOT_FOUND" };

  const validTo = input.validTo ?? null;
  if (validTo !== null && validTo < current.validFrom) {
    return { ok: false, code: "VALIDATION_FAILED", field: "validTo" };
  }
  const updated = await deps.memberships.endMembership(
    input.membershipId,
    validTo,
    input.version,
  );
  if (updated === "VERSION_CONFLICT") {
    return { ok: false, code: "CONFLICT_VERSION", current };
  }
  if (updated === "OVERLAP") return { ok: false, code: "DUPLICATE" };
  await auditMembership(deps, "memberships.update", {
    oldValue: current,
    newValue: updated,
    actorId: input.actorId,
  });
  return { ok: true, membership: updated };
}

/** Inclusive overlap for an open-ended new range starting at `validFrom`:
 * it conflicts with any existing membership whose LAST day (valid_to) is on
 * or after it. Open ranges were resolved by the caller (transfer/duplicate). */
function conflictsAt(validFrom: string, all: Membership[]): boolean {
  return all.some((m) => m.validTo !== null && validFrom <= m.validTo);
}

async function auditMembership(
  deps: MembershipDeps,
  action: string,
  entry: { oldValue: Membership | null; newValue: Membership; actorId: string },
) {
  await deps.audit.record({
    action,
    entityType: "membership",
    entityId: entry.newValue.id,
    actorId: entry.actorId,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    ip: null,
  });
}
