// Row 3 TEST suite: the history-safety guarantees SPEC §7 demands from the
// database itself — no employee in two teams on the same day (EC-11), no two
// rates covering the same day for one scope (EC-40), one live attendance
// entry per employee per day (EC-17) — plus the settings-row uniqueness that
// EC-53's optimistic concurrency stands on.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import * as schema from "../../src/db/schema";
import {
  addEntry,
  addMembership,
  addRate,
  addSetting,
  insertStatus,
  insertTeam,
  insertUser,
  errorCode,
  PG_EXCLUSION_VIOLATION,
  PG_UNIQUE_VIOLATION,
  startTestDb,
  type TestDb,
} from "./helpers";

let t: TestDb;
let teamA: string;
let userA: string;
let userB: string;
let statusId: string;

beforeAll(async () => {
  t = await startTestDb();
  teamA = await insertTeam(t.db);
  userA = await insertUser(t.db);
  userB = await insertUser(t.db);
  statusId = await insertStatus(t.db);
}, 60_000);

afterAll(() => t.stop(), 30_000);

describe("EC-11 · team_memberships exclusion (one team per employee per day)", () => {
  it("rejects a second overlapping membership for the same employee", async () => {
    await addMembership(t.db, {
      teamId: teamA,
      userId: userA,
      validFrom: "2026-10-01",
      validTo: null,
    });
    const code = await errorCode(
      addMembership(t.db, {
        teamId: teamA,
        userId: userA,
        validFrom: "2026-10-05",
        validTo: null,
      }),
    );
    expect(code).toBe(PG_EXCLUSION_VIOLATION);
  });

  it("accepts adjacent ranges — valid_to is inclusive, next range starts the following day", async () => {
    await addMembership(t.db, {
      teamId: teamA,
      userId: userB,
      validFrom: "2026-10-01",
      validTo: "2026-10-09",
    });
    await addMembership(t.db, {
      teamId: teamA,
      userId: userB,
      validFrom: "2026-10-10",
      validTo: null,
    });
  });

  it("accepts the same day in memberships of different employees", async () => {
    const other = await insertUser(t.db);
    await addMembership(t.db, {
      teamId: teamA,
      userId: other,
      validFrom: "2026-10-05",
      validTo: null,
    });
  });
});

describe("EC-40 · pay_rates exclusion per scope target", () => {
  it("rejects a second rate covering a day the same scope already covers", async () => {
    await addRate(t.db, {
      scopeType: "company",
      scopeKey: "company",
      amountMinor: 40_000,
      validFrom: "2026-01-01",
      validTo: null,
    });
    const code = await errorCode(
      addRate(t.db, {
        scopeType: "company",
        scopeKey: "company",
        amountMinor: 45_000,
        validFrom: "2026-10-01",
        validTo: "2026-10-09",
      }),
    );
    expect(code).toBe(PG_EXCLUSION_VIOLATION);
  });

  it("accepts adjacent rate windows for the same scope (mid-week change, SPEC §5.4)", async () => {
    const employeeKey = userA;
    await addRate(t.db, {
      scopeType: "employee",
      scopeKey: employeeKey,
      amountMinor: 60_000,
      validFrom: "2026-10-01",
      validTo: "2026-10-15",
    });
    await addRate(t.db, {
      scopeType: "employee",
      scopeKey: employeeKey,
      amountMinor: 70_000,
      validFrom: "2026-10-16",
      validTo: null,
    });
  });

  it("accepts overlapping windows across different scope targets", async () => {
    await addRate(t.db, {
      scopeType: "team",
      scopeKey: teamA,
      amountMinor: 50_000,
      validFrom: "2026-10-01",
      validTo: "2026-10-09",
    });
  });
});

describe("EC-17 · attendance_entries uniq(user_id, entry_date)", () => {
  it("rejects a second live entry for the same employee and day", async () => {
    await addEntry(t.db, {
      userId: userA,
      teamId: teamA,
      entryDate: "2026-10-12",
      statusId,
    });
    const code = await errorCode(
      addEntry(t.db, {
        userId: userA,
        teamId: teamA,
        entryDate: "2026-10-12",
        statusId,
      }),
    );
    expect(code).toBe(PG_UNIQUE_VIOLATION);
  });

  it("upserts through ON CONFLICT (user_id, entry_date) — the bulk write path (SPEC §10.5)", async () => {
    await t.db
      .insert(schema.attendanceEntries)
      .values({
        userId: userB,
        teamId: teamA,
        entryDate: "2026-10-12",
        statusId,
        amountMinor: 40_000,
        baseRateSnapshotMinor: 40_000,
      })
      .onConflictDoUpdate({
        target: [
          schema.attendanceEntries.userId,
          schema.attendanceEntries.entryDate,
        ],
        targetWhere: sql`deleted_at is null`,
        set: { amountMinor: 45_000 },
      });
    const rows = await t.query<{
      n: number;
    }>`select count(*)::int as n from attendance_entries where user_id = ${userB} and entry_date = '2026-10-12' and amount_minor = 45000`;
    expect(rows[0]?.n).toBe(1);
  });

  it("frees the day once the old entry is soft-deleted (partial unique index)", async () => {
    const userC = await insertUser(t.db);
    await addEntry(t.db, {
      userId: userC,
      teamId: teamA,
      entryDate: "2026-10-13",
      statusId,
    });
    await t.db.execute(
      sql`update attendance_entries set deleted_at = now() where user_id = ${userC}`,
    );
    await addEntry(t.db, {
      userId: userC,
      teamId: teamA,
      entryDate: "2026-10-13",
      statusId,
    });
  });
});

describe("settings uniq(key, scope_type, team_id, valid_from) — EC-53's foundation", () => {
  it("rejects a second company row for the same key and date (NULL team is not distinct)", async () => {
    await addSetting(t.db, {
      key: "attendance.entryMaxMinor",
      validFrom: "2026-01-01",
    });
    const code = await errorCode(
      addSetting(t.db, {
        key: "attendance.entryMaxMinor",
        validFrom: "2026-01-01",
      }),
    );
    expect(code).toBe(PG_UNIQUE_VIOLATION);
  });

  it("accepts a new effective-dated row for the same key (history is append-only)", async () => {
    await addSetting(t.db, {
      key: "attendance.entryMaxMinor",
      validFrom: "2026-11-01",
    });
  });
});
