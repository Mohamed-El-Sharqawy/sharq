// Row 13 — full-stack e2e backing (TESTING §9): the shared Neon Postgres
// (client-provided 2026-10-19; dev + e2e live there — no local container).
// Migrations + seed are idempotent, so every run just re-applies them before
// the servers boot. Locally the URL lives in gitignored apps/api/.env; CI
// carries it as the DATABASE_URL env var (from the NEON_DATABASE_URL
// secret), which this setup materializes back into apps/api/.env — the api
// webServer then boots identically everywhere (CI proved Playwright's
// webServer child-env is not load-bearing; never rely on it).
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "..", "..");

const run = (cmd: string) => {
  execSync(cmd, { cwd: root, stdio: "pipe" });
};

export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Plain KEY=VALUE — no quoting needed (no # or spaces in the URL).
    writeFileSync(resolve(root, "apps/api/.env"), `DATABASE_URL=${url}\n`);
  }
  // Both scripts run under bun inside apps/api (cwd) — .env loads there.
  run("pnpm db:migrate");
  run("pnpm seed");
}
