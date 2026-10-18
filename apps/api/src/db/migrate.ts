// Migrate helper — the one apply path for dev, integration suites and deploy
// (SPEC §8.4 db:migrate). The migrations folder ships committed SQL; the two
// EXCLUDE constraints (EC-11/EC-40) and the sharq_app role grants live in
// hand-maintained SQL at the end of the initial migration file — drizzle-kit
// cannot express either, and its snapshot differ never touches statements it
// did not generate.
import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb, type Db } from "./client";

export const migrationsFolder = path.join(
  import.meta.dir,
  "..",
  "..",
  "drizzle",
);

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder });
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error("DATABASE_URL is not set (apps/api/.env, SPEC §8.4)");
  const { db, client } = createDb(url);
  await runMigrations(db);
  await client.end();
  console.log(`migrations applied from ${migrationsFolder}`);
}
