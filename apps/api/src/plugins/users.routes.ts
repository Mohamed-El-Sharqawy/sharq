// SPEC §10.6 — the admin users plugin (FR-AUTH-04..06, FR-ADM-06): route
// defs + TypeBox validation (from @sharq/schemas), the auth/role guards,
// service calls, §10.4 envelope mapping (DUPLICATE → 409 carrying the
// field, CONFLICT_VERSION → 409 carrying the current row, NOT_FOUND →
// 404). Business rules live in modules/users; this file never touches
// drizzle.
import { Elysia } from "elysia";
import {
  CreateUserBody,
  ListUsersQuery,
  UpdateUserBody,
  UserVersionBody,
} from "@sharq/schemas";
import { cairoToday } from "../lib/cairo-today";
import { apiErrorStatus } from "../lib/errors";
import { createGuards } from "../lib/guard";
import type { createAuthService } from "../modules/auth/service";
import type {
  SetActiveResult,
  UpdateUserResult,
  createUsersService,
} from "../modules/users/service";

export type UsersRoutesDeps = {
  service: ReturnType<typeof createUsersService>;
  resolveSession: ReturnType<typeof createAuthService>["resolveSession"];
  isTeamSupervisor(userId: string, teamId: string): Promise<boolean>;
};

type Err = Exclude<UpdateUserResult | SetActiveResult, { ok: true }>;
type Caller = { id: string };

/** §10.4: CONFLICT_VERSION returns the current row (EC-16) — it rides meta
 * like RATE_LIMITED's retryAfterSeconds does. */
const conflict = (current: unknown) =>
  apiErrorStatus("CONFLICT_VERSION", undefined, { current });

const userError = (result: Err) => {
  if (result.code === "NOT_FOUND") return apiErrorStatus("NOT_FOUND");
  if (result.code === "DUPLICATE")
    return apiErrorStatus("DUPLICATE", { field: result.field });
  return conflict(result.current);
};

const createListHandler =
  (deps: UsersRoutesDeps) =>
  ({ query }: { query: ListUsersQuery }) =>
    deps.service.listUsers({
      page: query.page === undefined ? undefined : Number(query.page),
      pageSize:
        query.pageSize === undefined ? undefined : Number(query.pageSize),
      q: query.q,
      role: query.role,
      teamId: query.teamId,
      today: cairoToday(),
    });

const createCreateHandler =
  (deps: UsersRoutesDeps) =>
  async ({ body, user }: { body: CreateUserBody; user: Caller }) => {
    // CreateUserBody mirrors CreateUserInput field-for-field (phone stays
    // optional) — the spread is the whole mapping.
    const result = await deps.service.createUser({ actorId: user.id, ...body });
    return result.ok
      ? { user: result.user, tempPassword: result.tempPassword }
      : apiErrorStatus("DUPLICATE", { field: result.field });
  };

const createUpdateHandler =
  (deps: UsersRoutesDeps) =>
  async ({
    params,
    body,
    user,
  }: {
    params: { id: string };
    body: UpdateUserBody;
    user: Caller;
  }) => {
    const result = await deps.service.updateUser(
      {
        actorId: user.id,
        userId: params.id,
        patch: {
          displayNameAr: body.displayNameAr,
          phone: body.phone,
          role: body.role,
        },
        version: body.version,
      },
      new Date(),
    );
    return result.ok ? { user: result.user } : userError(result);
  };

const createResetHandler =
  (deps: UsersRoutesDeps) =>
  async ({ params, user }: { params: { id: string }; user: Caller }) => {
    const result = await deps.service.resetPassword(
      { actorId: user.id, userId: params.id },
      new Date(),
    );
    return result.ok
      ? { tempPassword: result.tempPassword }
      : apiErrorStatus("NOT_FOUND");
  };

/** deactivate/reactivate share the version-only contract (FR-AUTH-06). */
const createSetActiveHandler =
  (deps: UsersRoutesDeps, op: "deactivate" | "reactivate") =>
  async ({
    params,
    body,
    user,
  }: {
    params: { id: string };
    body: UserVersionBody;
    user: Caller;
  }) => {
    const result = await deps.service[op](
      { actorId: user.id, userId: params.id, version: body.version },
      new Date(),
    );
    return result.ok ? { user: result.user } : userError(result);
  };

export function createUsersRoutes(deps: UsersRoutesDeps) {
  const guards = createGuards({
    resolveSession: deps.resolveSession,
    isTeamSupervisor: deps.isTeamSupervisor,
  });
  return new Elysia({
    name: "users-routes",
    prefix: "/api/users",
    tags: ["users"],
  })
    .use(guards)
    .get("", createListHandler(deps), {
      auth: true,
      role: "admin",
      query: ListUsersQuery,
    })
    .post("", createCreateHandler(deps), {
      auth: true,
      role: "admin",
      body: CreateUserBody,
    })
    .patch("/:id", createUpdateHandler(deps), {
      auth: true,
      role: "admin",
      body: UpdateUserBody,
    })
    .post("/:id/reset-password", createResetHandler(deps), {
      auth: true,
      role: "admin",
    })
    .post("/:id/deactivate", createSetActiveHandler(deps, "deactivate"), {
      auth: true,
      role: "admin",
      body: UserVersionBody,
    })
    .post("/:id/reactivate", createSetActiveHandler(deps, "reactivate"), {
      auth: true,
      role: "admin",
      body: UserVersionBody,
    });
}
