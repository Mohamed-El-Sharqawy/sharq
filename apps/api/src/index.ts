// apps/api — Bun + Elysia service (SPEC §8.1). Boot: fail fast on missing
// env, wire the drizzle repo + audit port into the composed app, listen.
// Cross-cutting boot hardening (@elysiajs/env, pino, rate-limit) lands with
// the §10.7 rows — deliberate, not forgotten.
import { createApp } from "./app";
import { createDrizzleAudit } from "./lib/audit";
import { createDrizzleAuthRepo } from "./modules/auth/repository";
import { getAppDb } from "./db/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required (SPEC §8.4 .env)");

const { db } = getAppDb();
const repo = createDrizzleAuthRepo(db);

const app = createApp({
  repo,
  audit: createDrizzleAudit(db),
  isTeamSupervisor: repo.isTeamSupervisor,
  secureCookies: process.env.NODE_ENV === "production",
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port);
console.log(`sharq api listening on :${port}`);
