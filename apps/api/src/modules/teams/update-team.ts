// FR-ADM-02 — rename / replace supervisor under optimistic concurrency
// (§10.4: mismatch → CONFLICT_VERSION + current row). The OLD supervisor
// loses team-scoped access the moment supervisor_id changes — the guard
// reads teams.supervisor_id, so EC-09 needs no extra teardown (his own
// portal access is untouched while he stays active). Audited teams.update.
import type { UsersRepo } from "../users/service";
import type { AuditPort } from "../auth/types";
import { checkSupervisor } from "./supervisor";
import type { TeamsRepo, UpdateTeamInput, UpdateTeamResult } from "./types";

export type UpdateTeamDeps = {
  teams: TeamsRepo;
  users: UsersRepo;
  audit: AuditPort;
};

export async function updateTeam(
  deps: UpdateTeamDeps,
  input: UpdateTeamInput,
  now: Date,
): Promise<UpdateTeamResult> {
  const current = await deps.teams.findTeam(input.teamId);
  if (!current) return { ok: false, code: "NOT_FOUND" };

  const supervisorId = input.patch.supervisorId;
  if (supervisorId) {
    const check = await checkSupervisor(deps.users, supervisorId);
    if (check !== "ok") return { ok: false, code: check };
  }
  const updated = await deps.teams.updateTeam(
    input.teamId,
    input.patch,
    input.version,
    now,
  );
  if (updated === "VERSION_CONFLICT") {
    return { ok: false, code: "CONFLICT_VERSION", current };
  }
  await deps.audit.record({
    action: "teams.update",
    entityType: "team",
    entityId: updated.id,
    actorId: input.actorId,
    oldValue: current,
    newValue: updated,
    ip: null,
  });
  return { ok: true, team: updated };
}
