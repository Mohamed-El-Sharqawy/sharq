// Row 13 — e2e teardown: remove the ephemeral Postgres (global-setup.ts
// starts it). Best-effort: a crashed run also cleans up at next startup.
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "..", "..");

export default async function globalTeardown() {
  try {
    execSync("docker rm -f sharq-e2e-pg", {
      cwd: root,
      stdio: "pipe",
    });
  } catch {
    // already gone
  }
}
