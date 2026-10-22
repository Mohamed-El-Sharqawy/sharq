// apps/api — Bun + Elysia service (SPEC §8.1). Boot order: fail-fast env
// validation (§10.7), drizzle repo + audit port, pino logger, composed
// app, listen. Docs frontend is dev/test-only; prod ships the spec alone.
import { sql } from "drizzle-orm";
import { pino } from "pino";
import { createApp } from "./app";
import { createDrizzleAudit } from "./lib/audit";
import { parseEnv } from "./lib/env";
import { getAppDb } from "./db/client";
import { createDrizzleAuthRepo } from "./modules/auth/repository";
import { createDrizzleConfigRepo } from "./modules/config/repository";
import { createDrizzleUsersRepo } from "./modules/users/repository";
import { createDrizzleTeamsRepo } from "./modules/teams/repository";
import { createDrizzleMembershipsRepo } from "./modules/teams/membership-repository";

const env = parseEnv(process.env);
const logger = pino({ level: env.LOG_LEVEL });

const { db } = getAppDb();
const repo = createDrizzleAuthRepo(db);

const app = createApp({
  repo,
  usersRepo: createDrizzleUsersRepo(db),
  teamsRepo: createDrizzleTeamsRepo(db),
  membershipsRepo: createDrizzleMembershipsRepo(db),
  configRepo: createDrizzleConfigRepo(db),
  audit: createDrizzleAudit(db),
  isTeamSupervisor: repo.isTeamSupervisor,
  dbCheck: async () => {
    try {
      await db.execute(sql`select 1`);
      return true;
    } catch (error) {
      // A 503 with no reason in the logs cost a day of e2e debugging —
      // always surface WHY the round-trip failed.
      logger.warn({ error: String(error) }, "health db check failed");
      return false;
    }
  },
  secureCookies: env.NODE_ENV === "production",
  logger,
  rateLimit: { authPerMinute: env.RATE_LIMIT_AUTH_PER_MIN },
  exposeDocs: env.NODE_ENV !== "production",
});

app.listen(env.PORT);
logger.info({ port: env.PORT }, "sharq api listening");
