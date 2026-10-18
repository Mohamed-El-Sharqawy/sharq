// Row 3/4 companion suite: the migration delivers the full SPEC §7 table
// inventory, and the audit log is append-only at the DB-role level — the
// application role may INSERT and read audit rows but can never rewrite or
// erase them (FR-AUD-04, SPEC §15).
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import postgres from "postgres";
import {
  errorCode,
  PG_INSUFFICIENT_PRIVILEGE,
  startTestDb,
  type TestDb,
} from "./helpers";

let t: TestDb;

beforeAll(async () => {
  t = await startTestDb();
}, 60_000);

afterAll(() => t.stop(), 30_000);

const SPEC_7_TABLES = [
  "users",
  "sessions",
  "teams",
  "team_memberships",
  "pay_rates",
  "settings",
  "reason_catalog",
  "attendance_statuses",
  "attendance_entries",
  "deductions",
  "pay_periods",
  "adjustments",
  "holidays",
  "audit_log",
];

describe("SPEC §7 · migration inventory", () => {
  it("creates every table the SPEC §7 data model names", async () => {
    const rows = await t.query<{
      table_name: string;
    }>`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`;
    const present = new Set(rows.map((r) => r.table_name));
    for (const name of SPEC_7_TABLES) {
      expect(present.has(name), `table ${name} should exist`).toBe(true);
    }
  });
});

describe("FR-AUD-04 · audit_log append-only at the role level (SPEC §15)", () => {
  it("lets sharq_app insert audit rows but rejects update and delete", async () => {
    // Single dedicated connection: SET ROLE is per-session and the pool must
    // not hand the next statement to a superuser connection.
    const conn = postgres(t.url, { max: 1 });
    try {
      await conn`set role sharq_app`;
      await conn`insert into audit_log (action, entity_type, entity_id) values ('test.insert', 'migration_test', 'n/a')`;
      expect(
        await errorCode(conn`update audit_log set action = 'tampered'`),
      ).toBe(PG_INSUFFICIENT_PRIVILEGE);
      expect(await errorCode(conn`delete from audit_log`)).toBe(
        PG_INSUFFICIENT_PRIVILEGE,
      );
    } finally {
      await conn`reset role`.catch(() => undefined);
      await conn.end();
    }
  });
});
