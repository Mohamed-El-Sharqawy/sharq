// Row 3 TEST suite (1/3): the effective-dating exclusions from SPEC §7 —
// no employee in two teams on the same day (EC-11), no two rates covering
// the same day for one scope target (EC-40). Adjacent windows are the
// SPEC §5.4 mid-week-change shape and must stay legal.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  addMembership,
  addRate,
  errorCode,
  insertTeam,
  insertUser,
  PG_EXCLUSION_VIOLATION,
  startTestDb,
  type TestDb,
} from "./helpers";

let t: TestDb;
let teamA: string;
let userA: string;
let userB: string;

beforeAll(async () => {
  t = await startTestDb();
  teamA = await insertTeam(t.db);
  userA = await insertUser(t.db);
  userB = await insertUser(t.db);
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
    await addRate(t.db, {
      scopeType: "employee",
      scopeKey: userA,
      amountMinor: 60_000,
      validFrom: "2026-10-01",
      validTo: "2026-10-15",
    });
    await addRate(t.db, {
      scopeType: "employee",
      scopeKey: userA,
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
