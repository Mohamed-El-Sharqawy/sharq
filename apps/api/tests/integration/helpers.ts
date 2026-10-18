// Integration plumbing for the migration suites (TESTING §7): one ephemeral
// Postgres per suite file — started in beforeAll, migrated at setup, stopped
// in afterAll. Suites never share a container, so they stay isolated and can
// run in parallel. Image matches the dev container (postgres:18-alpine).
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { runMigrations } from "../../src/db/migrate";
import * as schema from "../../src/db/schema";

export type TestDb = {
  db: PostgresJsDatabase<typeof schema>;
  /** Raw postgres.js handle for SQL-level assertions (catalog, SET ROLE…). */
  query: Sql;
  url: string;
  stop: () => Promise<void>;
};

export async function startTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer("postgres:18-alpine").start();
  // drizzle(client) swaps the client's date/time parsers for identity
  // functions (it maps dates per column itself) — a mutation on the SHARED
  // client options. The raw handle therefore gets its own pristine client so
  // raw SQL assertions keep postgres.js semantics (timestamptz → Date).
  const drizzleClient = postgres(container.getConnectionUri());
  const query = postgres(container.getConnectionUri());
  const db = drizzle(drizzleClient, { schema });
  await runMigrations(db);
  return {
    db,
    query,
    url: container.getConnectionUri(),
    stop: async () => {
      await query.end();
      await drizzleClient.end();
      await container.stop();
    },
  };
}

// Postgres error codes the suites assert on (ERRCODE class 23/42).
export const PG_EXCLUSION_VIOLATION = "23P01";
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_INSUFFICIENT_PRIVILEGE = "42501";

// Awaits a statement that must be rejected; returns its Postgres error code.
// Drizzle wraps driver errors in DrizzleQueryError, so the PG code can sit on
// any link of the cause chain.
export async function errorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    for (let e = error; e; e = (e as { cause?: unknown }).cause) {
      const code = (e as { code?: unknown }).code;
      if (typeof code === "string") return code;
    }
    throw error;
  }
  throw new Error("expected the statement to be rejected, but it succeeded");
}

// Unique fixture keys per container (each suite file gets a fresh database).
let seq = 0;
const next = (prefix: string) => `${prefix}-${++seq}`;

export async function insertUser(
  db: TestDb["db"],
  role: "employee" | "supervisor" | "admin" = "employee",
): Promise<string> {
  const rows = await db
    .insert(schema.users)
    .values({
      username: next("user"),
      displayNameAr: next("person"),
      passwordHash: "fixture-not-a-real-hash",
      role,
    })
    .returning({ id: schema.users.id });
  const row = rows[0];
  if (!row) throw new Error("fixture user insert returned no row");
  return row.id;
}

export async function insertTeam(db: TestDb["db"]): Promise<string> {
  const rows = await db
    .insert(schema.teams)
    .values({ nameAr: next("team") })
    .returning({ id: schema.teams.id });
  const row = rows[0];
  if (!row) throw new Error("fixture team insert returned no row");
  return row.id;
}

export async function insertStatus(db: TestDb["db"]): Promise<string> {
  const rows = await db
    .insert(schema.attendanceStatuses)
    .values({
      code: next("status"),
      nameAr: next("status-name"),
      carriesPay: true,
    })
    .returning({ id: schema.attendanceStatuses.id });
  const row = rows[0];
  if (!row) throw new Error("fixture status insert returned no row");
  return row.id;
}

// Statement builders (not awaited) so tests can assert the rejection itself.
export function addMembership(
  db: TestDb["db"],
  v: {
    teamId: string;
    userId: string;
    validFrom: string;
    validTo: string | null;
  },
) {
  return db.insert(schema.teamMemberships).values(v);
}

export function addRate(
  db: TestDb["db"],
  v: {
    scopeType: "company" | "team" | "employee";
    scopeKey: string;
    amountMinor: number;
    validFrom: string;
    validTo: string | null;
  },
) {
  return db.insert(schema.payRates).values(v);
}

export function addEntry(
  db: TestDb["db"],
  v: { userId: string; teamId: string; entryDate: string; statusId: string },
) {
  return db.insert(schema.attendanceEntries).values({
    ...v,
    amountMinor: 40_000,
    baseRateSnapshotMinor: 40_000,
  });
}

export function addSetting(
  db: TestDb["db"],
  v: { key: string; validFrom: string; teamId?: string | null },
) {
  return db.insert(schema.settings).values({
    key: v.key,
    scopeType: v.teamId ? "team" : "company",
    teamId: v.teamId ?? null,
    value: { any: "registry-validated-in-phase-3" },
    validFrom: v.validFrom,
  });
}
