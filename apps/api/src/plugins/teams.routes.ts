// SPEC §10.6 — the admin teams + memberships plugin (FR-ADM-01..05):
// route defs + TypeBox validation, the auth/role guards, service calls,
// §10.4 envelope mapping (overlap/already-member → 409 DUPLICATE per
// EC-08/11, CONFLICT_VERSION → 409 carrying the current row, invalid
// supervisor/inactive user → 422 with the field). Business rules live in
// modules/teams; this file never touches drizzle.
import { Elysia } from "elysia";
import {
  AddMemberBody,
  CreateTeamBody,
  ListTeamsQuery,
  UpdateMemberBody,
  UpdateTeamBody,
} from "@sharq/schemas";
import { createGuards } from "../lib/guard";
import type { createAuthService } from "../modules/auth/service";
import type { createTeamsService } from "../modules/teams/service";
import {
  addMemberError,
  supervisorError,
  teamError,
  updateMemberError,
} from "./teams.errors";

export type TeamsRoutesDeps = {
  service: ReturnType<typeof createTeamsService>;
  resolveSession: ReturnType<typeof createAuthService>["resolveSession"];
  isTeamSupervisor(userId: string, teamId: string): Promise<boolean>;
};

type Caller = { id: string };

const createListHandler =
  (deps: TeamsRoutesDeps) =>
  ({ query }: { query: ListTeamsQuery }) =>
    deps.service.listTeams({
      page: query.page === undefined ? undefined : Number(query.page),
      pageSize:
        query.pageSize === undefined ? undefined : Number(query.pageSize),
    });

const createCreateHandler =
  (deps: TeamsRoutesDeps) =>
  async ({ body, user }: { body: CreateTeamBody; user: Caller }) => {
    const result = await deps.service.createTeam({
      actorId: user.id,
      nameAr: body.nameAr,
      supervisorId: body.supervisorId,
    });
    return result.ok ? { team: result.team } : supervisorError(result.code);
  };

const createUpdateHandler =
  (deps: TeamsRoutesDeps) =>
  async ({
    params,
    body,
    user,
  }: {
    params: { id: string };
    body: UpdateTeamBody;
    user: Caller;
  }) => {
    const result = await deps.service.updateTeam(
      {
        actorId: user.id,
        teamId: params.id,
        patch: { nameAr: body.nameAr, supervisorId: body.supervisorId },
        version: body.version,
      },
      new Date(),
    );
    return result.ok ? { team: result.team } : teamError(result);
  };

const createAddMemberHandler =
  (deps: TeamsRoutesDeps) =>
  async ({
    params,
    body,
    user,
  }: {
    params: { id: string };
    body: AddMemberBody;
    user: Caller;
  }) => {
    const result = await deps.service.addMember({
      actorId: user.id,
      teamId: params.id,
      userId: body.userId,
      validFrom: body.validFrom,
    });
    return result.ok
      ? { membership: result.membership }
      : addMemberError(result);
  };

const createUpdateMemberHandler =
  (deps: TeamsRoutesDeps) =>
  async ({
    params,
    body,
    user,
  }: {
    params: { id: string; mid: string };
    body: UpdateMemberBody;
    user: Caller;
  }) => {
    const result = await deps.service.updateMember({
      actorId: user.id,
      teamId: params.id,
      membershipId: params.mid,
      validTo: body.validTo,
      version: body.version,
    });
    return result.ok
      ? { membership: result.membership }
      : updateMemberError(result);
  };

export function createTeamsRoutes(deps: TeamsRoutesDeps) {
  const guards = createGuards({
    resolveSession: deps.resolveSession,
    isTeamSupervisor: deps.isTeamSupervisor,
  });
  return new Elysia({
    name: "teams-routes",
    prefix: "/api/teams",
    tags: ["teams"],
  })
    .use(guards)
    .get("", createListHandler(deps), {
      auth: true,
      role: "admin",
      query: ListTeamsQuery,
    })
    .post("", createCreateHandler(deps), {
      auth: true,
      role: "admin",
      body: CreateTeamBody,
    })
    .patch("/:id", createUpdateHandler(deps), {
      auth: true,
      role: "admin",
      body: UpdateTeamBody,
    })
    .post("/:id/members", createAddMemberHandler(deps), {
      auth: true,
      role: "admin",
      body: AddMemberBody,
    })
    .patch("/:id/members/:mid", createUpdateMemberHandler(deps), {
      auth: true,
      role: "admin",
      body: UpdateMemberBody,
    });
}
