// SPEC §10.1 — the teams service surface (roadmap row 4's plugins consume
// only this factory). Memberships compose the users repo for live/active
// checks; audit actions follow lib/audit.ts §15 naming.
import type { AuditPort } from "../auth/types";
import type { UsersRepo } from "../users/service";
import { createTeam } from "./create-team";
import { listTeams } from "./list-teams";
import { addMember, updateMember } from "./memberships";
import { updateTeam } from "./update-team";
import type {
  AddMemberInput,
  AddMemberResult,
  CreateTeamInput,
  CreateTeamResult,
  ListTeamsInput,
  Membership,
  MembershipsRepo,
  TeamsPage,
  TeamsRepo,
  UpdateMemberInput,
  UpdateMemberResult,
  UpdateTeamInput,
  UpdateTeamResult,
} from "./types";

export type TeamsServiceDeps = {
  teams: TeamsRepo;
  memberships: MembershipsRepo;
  users: UsersRepo;
  audit: AuditPort;
};

export type {
  AddMemberInput,
  AddMemberResult,
  AdminTeam,
  CreateTeamInput,
  CreateTeamResult,
  ListTeamsInput,
  Membership,
  MembershipsRepo,
  MembershipsTx,
  TeamsPage,
  TeamsRepo,
  UpdateMemberInput,
  UpdateMemberResult,
  UpdateTeamInput,
  UpdateTeamResult,
} from "./types";

export function createTeamsService(deps: TeamsServiceDeps) {
  return {
    createTeam: (input: CreateTeamInput): Promise<CreateTeamResult> =>
      createTeam(deps, input),
    updateTeam: (
      input: UpdateTeamInput,
      now: Date,
    ): Promise<UpdateTeamResult> => updateTeam(deps, input, now),
    listTeams: (input: ListTeamsInput): Promise<TeamsPage> =>
      listTeams(deps.teams, input),
    addMember: (input: AddMemberInput): Promise<AddMemberResult> =>
      addMember(deps, input),
    updateMember: (input: UpdateMemberInput): Promise<UpdateMemberResult> =>
      updateMember(deps, input),
  };
}

export type TeamsService = ReturnType<typeof createTeamsService>;
export type { Membership as TeamMembership };
