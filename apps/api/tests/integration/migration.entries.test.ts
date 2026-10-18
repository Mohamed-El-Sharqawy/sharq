// Row 3 TEST suite (2/3): one LIVE attendance entry per employee per day
// (EC-17 — the bulk upsert path stands on it, SPEC §10.5) and the settings
// row uniqueness EC-53's optimistic concurrency stands on. The unique index
// is partial (WHERE deleted_at IS NULL): soft-deleting an entry frees the
// day for re-recording while history stays readable.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import * as schema from "../../src/db/schema";
import {
  addEntry,
  addSetting,
  errorCode,
  insertStatus,
  insertTeam,
  insertUser,
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
    await addEntry(t.db, {
      userId: userB,
      teamId: teamA,
      entryDate: "2026-10-12",
      statusId,
    });
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
    const rows = await t.query<
      { n: number }[]
    >`select count(*)::int as n from attendance_entries where user_id = ${userB} and entry_date = '2026-10-12' and amount_minor = 45000`;
    expect(rows[0]?.n).toBe(1);
  });
});

describe("EC-17 · soft delete frees the day (partial unique index)", () => {
  it("accepts a new live entry for a day whose old entry is soft-deleted", async () => {
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
