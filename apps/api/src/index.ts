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

const env = parseEnv(process.env);
const logger = pino({ level: env.LOG_LEVEL });

const { db } = getAppDb();
const repo = createDrizzleAuthRepo(db);

const app = createApp({
  repo,
  audit: createDrizzleAudit(db),
  isTeamSupervisor: repo.isTeamSupervisor,
  dbCheck: async () => {
    try {
      await db.execute(sql`select 1`);
      return true;
    } catch {
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
