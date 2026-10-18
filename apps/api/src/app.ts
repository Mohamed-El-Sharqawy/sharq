// apps/api — composes feature plugins and exports `type App` for Eden
// (SPEC §8.1, §10.1). Dependencies are injected so units drive the whole app
// over mocked ports; production wiring (drizzle + audit) lives in index.ts.
import { Elysia } from "elysia";
import { createAuthRoutes } from "./plugins/auth.routes";
import { createAuthService } from "./modules/auth/service";
import { createMemoryLockoutStore } from "./modules/auth/lockout";
import { apiErrorStatus } from "./lib/errors";
import type { AuditPort, AuthRepo } from "./modules/auth/types";

export type AppDeps = {
  repo: AuthRepo;
  audit: AuditPort;
  isTeamSupervisor(userId: string, teamId: string): Promise<boolean>;
  /** Prod: Secure on the session cookie (§10.2). */
  secureCookies?: boolean;
  /** Test override; prod reads the registry default (240 min). */
  idleMinutes?: number;
};

export function createApp(deps: AppDeps) {
  const service = createAuthService({
    repo: deps.repo,
    lockout: createMemoryLockoutStore(),
    audit: deps.audit,
    idleMinutes: deps.idleMinutes,
  });
  return new Elysia({ name: "sharq-api" })
    .onError({ as: "global" }, ({ code }) => {
      // §10.4: validation/parse problems are VALIDATION_FAILED; anything
      // uncaught is INTERNAL (details logged in row 12's pino wiring).
      if (code === "VALIDATION" || code === "PARSE") {
        return apiErrorStatus("VALIDATION_FAILED");
      }
      return apiErrorStatus("INTERNAL");
    })
    .use(
      createAuthRoutes({
        service,
        isTeamSupervisor: deps.isTeamSupervisor,
        secureCookies: deps.secureCookies ?? false,
      }),
    );
}

export type App = ReturnType<typeof createApp>;
