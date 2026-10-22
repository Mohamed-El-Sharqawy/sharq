// SPEC §10.1 — pay_rates repository. The §7 EXCLUDE constraint per scope
// rejects overlapping inserts; this repo maps that 23P01 to "OVERLAP" (the
// service's race backstop behind the inclusive pre-check) exactly like the
// memberships repo does.
import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";
import { pgErrorInfo } from "../../lib/pg";
import type { RateRecord, RatesRepo } from "./types";

type Db = PostgresJsDatabase<typeof schema>;
type Row = typeof schema.payRates.$inferSelect;

export function createDrizzleRatesRepo(db: Db): RatesRepo {
  return {
    listRates: () => listRates(db),
    ratesForScope: (scopeType, scopeKey) =>
      ratesForScope(db, scopeType, scopeKey),
    findRate: (id) => findRate(db, id),
    insertRate: (input) => insertRate(db, input),
    updateRate: (id, patch, expectedVersion) =>
      updateRate(db, { id, patch, expectedVersion }),
  };
}

function toRecord(row: Row): RateRecord {
  return {
    id: row.id,
    scopeType: row.scopeType,
    scopeKey: row.scopeKey,
    amountMinor: row.amountMinor,
    validFrom: row.validFrom,
    validTo: row.validTo,
    note: row.note,
    version: row.version,
  };
}

async function listRates(db: Db): Promise<RateRecord[]> {
  const rows = await db
    .select()
    .from(schema.payRates)
    .orderBy(
      asc(schema.payRates.scopeType),
      asc(schema.payRates.scopeKey),
      asc(schema.payRates.validFrom),
    );
  return rows.map(toRecord);
}

async function ratesForScope(
  db: Db,
  scopeType: string,
  scopeKey: string,
): Promise<RateRecord[]> {
  const rows = await db
    .select()
    .from(schema.payRates)
    .where(
      and(
        eq(schema.payRates.scopeType, scopeType as Row["scopeType"]),
        eq(schema.payRates.scopeKey, scopeKey),
      ),
    )
    .orderBy(asc(schema.payRates.validFrom));
  return rows.map(toRecord);
}

async function findRate(db: Db, id: string): Promise<RateRecord | undefined> {
  const rows = await db
    .select()
    .from(schema.payRates)
    .where(eq(schema.payRates.id, id))
    .limit(1);
  const row = rows[0];
  return row ? toRecord(row) : undefined;
}

async function insertRate(
  db: Db,
  input: Parameters<RatesRepo["insertRate"]>[0],
): Promise<RateRecord | "OVERLAP"> {
  try {
    const rows = await db
      .insert(schema.payRates)
      .values({
        scopeType: input.scopeType as Row["scopeType"],
        scopeKey: input.scopeKey,
        amountMinor: input.amountMinor,
        validFrom: input.validFrom,
        validTo: null, // POST opens rows; closing is a PATCH (§10.6)
        note: input.note,
        createdBy: input.createdBy,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("rate insert returned no row");
    return toRecord(row);
  } catch (error) {
    if (pgErrorInfo(error).code === "23P01") return "OVERLAP";
    throw error;
  }
}

async function updateRate(
  db: Db,
  args: {
    id: string;
    patch: { validTo?: string | null; amountMinor?: number };
    expectedVersion: number;
  },
): Promise<RateRecord | "VERSION_CONFLICT" | "OVERLAP"> {
  try {
    // drizzle skips undefined keys — absent fields stay untouched.
    const rows = await db
      .update(schema.payRates)
      .set({
        validTo: args.patch.validTo,
        amountMinor: args.patch.amountMinor,
        version: args.expectedVersion + 1,
      })
      .where(
        and(
          eq(schema.payRates.id, args.id),
          eq(schema.payRates.version, args.expectedVersion),
        ),
      )
      .returning();
    const row = rows[0];
    return row ? toRecord(row) : "VERSION_CONFLICT";
  } catch (error) {
    // Reopening into a later row's range trips the §7 exclusion.
    if (pgErrorInfo(error).code === "23P01") return "OVERLAP";
    throw error;
  }
}
