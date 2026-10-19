// FR-ADM-01 — create team (Arabic name + optional supervisor): it exists
// with zero members by definition, and an open period can be generated for
// it (Phase 3). Audited teams.create (§15; old value is null). No `now`
// parameter — created_at/updated_at are column defaults.
import type { UsersRepo } from "../users/service";
import type { AuditPort } from "../auth/types";
import { checkSupervisor } from "./supervisor";
import type { CreateTeamInput, CreateTeamResult, TeamsRepo } from "./types";

export type CreateTeamDeps = {
  teams: TeamsRepo;
  users: UsersRepo;
  audit: AuditPort;
};

export async function createTeam(
  deps: CreateTeamDeps,
  input: CreateTeamInput,
): Promise<CreateTeamResult> {
  const supervisorId = input.supervisorId ?? null;
  if (supervisorId) {
    const check = await checkSupervisor(deps.users, supervisorId);
    if (check !== "ok") return { ok: false, code: check };
  }
  const team = await deps.teams.insertTeam({
    nameAr: input.nameAr,
    supervisorId,
  });
  await deps.audit.record({
    action: "teams.create",
    entityType: "team",
    entityId: team.id,
    actorId: input.actorId,
    newValue: team,
    ip: null,
  });
  return { ok: true, team };
}
