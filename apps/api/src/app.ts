// apps/api — composes feature plugins and exports `type App` for Eden
// (SPEC §8.1, §10.1). Dependencies are injected so units drive the whole
// app over mocked ports; production wiring (drizzle + audit + pino) lives
// in index.ts.
import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import pkg from "../package.json";
import { createAuthRoutes } from "./plugins/auth.routes";
import { createHealthRoutes } from "./plugins/health.routes";
import { createTeamsRoutes } from "./plugins/teams.routes";
import { createUsersRoutes } from "./plugins/users.routes";
import { createConfigRoutes } from "./plugins/config.routes";
import { createAuthService } from "./modules/auth/service";
import { createMemoryLockoutStore } from "./modules/auth/lockout";
import { createConfigService } from "./modules/config/service";
import { createTeamsService } from "./modules/teams/service";
import { createUsersService } from "./modules/users/service";
import { apiErrorStatus } from "./lib/errors";
import { createObsRoutes, type RequestLogSink } from "./lib/obs";
import type { AuditPort, AuthRepo } from "./modules/auth/types";
import type { ConfigRepo } from "./modules/config/service";
import type { UsersRepo } from "./modules/users/service";
import type { MembershipsRepo, TeamsRepo } from "./modules/teams/service";

export type AppDeps = {
  repo: AuthRepo;
  /** Admin user management (FR-AUTH-04..06, FR-ADM-06). */
  usersRepo: UsersRepo;
  /** Teams + effective-dated memberships (FR-ADM-01..05). */
  teamsRepo: TeamsRepo;
  membershipsRepo: MembershipsRepo;
  /** §5 dynamic configuration (FR-SET-01..06, §10.6 config rows). */
  configRepo: ConfigRepo;
  audit: AuditPort;
  isTeamSupervisor(userId: string, teamId: string): Promise<boolean>;
  /** §10.7 health probe: one DB round-trip. */
  dbCheck(): Promise<boolean>;
  /** Prod: Secure on the session cookie (§10.2). */
  secureCookies?: boolean;
  /** Test override; prod reads the registry default (240 min). */
  idleMinutes?: number;
  /** §10.7 pino sink — omitted means silent (tests that don't assert logs). */
  logger?: RequestLogSink;
  /** §10.7 buckets; the default is the login 10/min/IP fixed in code. */
  rateLimit?: { authPerMinute?: number };
  /** §10.7 docs frontend (Scalar at /docs) — prod ships the spec only. */
  exposeDocs?: boolean;
};

/** The §10.1 service composition over the injected ports — module-level
 * so createApp stays inside the §9.3 function budget. */
function buildServices(deps: AppDeps) {
  const auth = createAuthService({
    repo: deps.repo,
    lockout: createMemoryLockoutStore(),
    audit: deps.audit,
    idleMinutes: deps.idleMinutes,
  });
  return {
    auth,
    users: createUsersService({ repo: deps.usersRepo, audit: deps.audit }),
    teams: createTeamsService({
      teams: deps.teamsRepo,
      memberships: deps.membershipsRepo,
      users: deps.usersRepo,
      audit: deps.audit,
    }),
    config: createConfigService({ repo: deps.configRepo, audit: deps.audit }),
  };
}

export function createApp(deps: AppDeps) {
  const service = buildServices(deps);
  /** Guard deps shared by every route plugin (§10.2). */
  const guardDeps = {
    resolveSession: service.auth.resolveSession,
    isTeamSupervisor: deps.isTeamSupervisor,
  };
  return new Elysia({ name: "sharq-api" })
    .use(createObsRoutes({ logger: deps.logger }))
    .use(
      openapi({
        path: "/docs",
        specPath: "/openapi.json",
        provider: deps.exposeDocs === false ? null : "scalar",
        documentation: {
          info: { title: "sharq API", version: pkg.version },
        },
      }),
    )
    .onError({ as: "global" }, ({ code }) => {
      // §10.4: validation/parse problems are VALIDATION_FAILED; unknown
      // routes are NOT_FOUND (Elysia delivers them through this handler —
      // without this branch they 500); anything uncaught is INTERNAL
      // (details land in the §10.7 request log).
      if (code === "VALIDATION" || code === "PARSE") {
        return apiErrorStatus("VALIDATION_FAILED");
      }
      if (code === "NOT_FOUND") {
        return apiErrorStatus("NOT_FOUND");
      }
      return apiErrorStatus("INTERNAL");
    })
    .use(
      createAuthRoutes({
        service: service.auth,
        isTeamSupervisor: deps.isTeamSupervisor,
        secureCookies: deps.secureCookies ?? false,
        authRateLimitMax: deps.rateLimit?.authPerMinute ?? 10,
      }),
    )
    .use(createUsersRoutes({ service: service.users, ...guardDeps }))
    .use(createTeamsRoutes({ service: service.teams, ...guardDeps }))
    .use(
      createConfigRoutes({
        service: service.config,
        resolveSession: guardDeps.resolveSession,
      }),
    )
    .use(createHealthRoutes({ dbCheck: deps.dbCheck }));
}

export type App = ReturnType<typeof createApp>;
