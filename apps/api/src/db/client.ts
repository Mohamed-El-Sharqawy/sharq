// Drizzle client factory (postgres.js driver, runs under Bun). The app
// singleton reads DATABASE_URL lazily so importing this module never opens a
// connection — tests build throwaway clients against their Testcontainer.
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

export function createDb(url: string): { db: Db; client: Sql } {
  const client = postgres(url, { max: 10 });
  return { db: drizzle(client, { schema }), client };
}

let appDbHandle: { db: Db; client: Sql } | undefined;

/** Process-wide client for the running service (SPEC §10.1 repositories). */
export function getAppDb(): { db: Db; client: Sql } {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error("DATABASE_URL is not set (apps/api/.env, SPEC §8.4)");
  appDbHandle ??= createDb(url);
  return appDbHandle;
}
