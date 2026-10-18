// apps/api — composes feature plugins and exports `type App` for Eden
// (SPEC §8.1, §10.1). Dependencies are injected so units drive the whole
// app over mocked ports; production wiring (drizzle + audit + pino) lives
// in index.ts.
import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import pkg from "../package.json";
import { createAuthRoutes } from "./plugins/auth.routes";
import { createHealthRoutes } from "./plugins/health.routes";
import { createAuthService } from "./modules/auth/service";
import { createMemoryLockoutStore } from "./modules/auth/lockout";
import { apiErrorStatus } from "./lib/errors";
import { createObsRoutes, type RequestLogSink } from "./lib/obs";
import type { AuditPort, AuthRepo } from "./modules/auth/types";

export type AppDeps = {
  repo: AuthRepo;
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

export function createApp(deps: AppDeps) {
  const service = createAuthService({
    repo: deps.repo,
    lockout: createMemoryLockoutStore(),
    audit: deps.audit,
    idleMinutes: deps.idleMinutes,
  });
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
        service,
        isTeamSupervisor: deps.isTeamSupervisor,
        secureCookies: deps.secureCookies ?? false,
        authRateLimitMax: deps.rateLimit?.authPerMinute ?? 10,
      }),
    )
    .use(createHealthRoutes({ dbCheck: deps.dbCheck }));
}

export type App = ReturnType<typeof createApp>;
