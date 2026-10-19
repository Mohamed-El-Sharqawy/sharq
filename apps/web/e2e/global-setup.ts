// Row 13 — full-stack e2e backing (TESTING §9): an ephemeral Postgres for
// every run, migrated + seeded with the TESTING §15 personas, so F-01 (and
// later flows) hit the real api over the real DB — never the dev volume.
// Docker is required for e2e from this row on (it already is for the api
// integration suites). Fixed host port 5434 keeps the webServer env static
// (5432 may be taken by a native postgres, 5433 is the dev container).
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const CONTAINER = "sharq-e2e-pg";
const PORT = "5434";
const DATABASE_URL = `postgresql://sharq:sharq@localhost:${PORT}/sharq`;
const root = resolve(process.cwd(), "..", "..");

const run = (cmd: string, env: NodeJS.ProcessEnv = {}) => {
  execSync(cmd, {
    cwd: root,
    stdio: "pipe",
    env: { ...process.env, ...env },
  });
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default async function globalSetup() {
  // A crashed run may leave the container behind — name/port must be free.
  try {
    run(`docker rm -f ${CONTAINER}`);
  } catch {
    // nothing to clean
  }
  run(
    `docker run -d --name ${CONTAINER} -p 127.0.0.1:${PORT}:5432 ` +
      `-e POSTGRES_USER=sharq -e POSTGRES_PASSWORD=sharq ` +
      `-e POSTGRES_DB=sharq postgres:18-alpine`,
  );
  for (let i = 0; i < 90; i++) {
    try {
      run(`docker exec ${CONTAINER} pg_isready -U sharq -d sharq`);
      break;
    } catch {
      await sleep(500);
      if (i === 89) throw new Error("e2e postgres never became ready");
    }
  }
  run("pnpm db:migrate", { DATABASE_URL });
  run("pnpm seed", { DATABASE_URL });
}
