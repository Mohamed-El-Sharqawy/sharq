// Row 13 — full-stack e2e backing (TESTING §9): the shared Neon Postgres
// (client-provided 2026-10-19; dev + e2e live there — no local container).
// Migrations + seed are idempotent, so every run just re-applies them before
// the servers boot. DATABASE_URL comes from apps/api/.env (bun auto-loads
// it; local) or the CI secret env var (which wins if both exist).
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "..", "..");

const run = (cmd: string) => {
  execSync(cmd, { cwd: root, stdio: "pipe" });
};

export default async function globalSetup() {
  // Both scripts run under bun inside apps/api (cwd) — .env loads there.
  run("pnpm db:migrate");
  run("pnpm seed");
}
