// Row 9 companion: the auth repo's new members over real Postgres —
// updatePassword persists the hash and clears must_change_password
// (FR-AUTH-05/07), findUserById hides soft-deleted rows (§7 soft delete),
// isTeamSupervisor drives guard.teamScope off teams.supervisor_id (§10.2).
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "../../src/db/schema";
import { createDrizzleAuthRepo } from "../../src/modules/auth/repository";
import { hashPassword } from "../../src/modules/auth/password";
import { insertAuthUser, type AuthFixture } from "./auth.helpers";
import { startTestDb, type TestDb } from "./helpers";

let t: TestDb;
let repo: ReturnType<typeof createDrizzleAuthRepo>;
let user: AuthFixture;
const NOW = new Date("2026-10-18T12:00:00Z");

beforeAll(async () => {
  t = await startTestDb();
  repo = createDrizzleAuthRepo(t.db);
  user = await insertAuthUser(t.db, { password: "Repo-Pw#2026" });
}, 60_000);

afterAll(() => t.stop(), 30_000);

async function insertTeam(
  nameAr: string,
  supervisorId: string | null,
  isActive = true,
) {
  const rows = await t.db
    .insert(schema.teams)
    .values({ nameAr, supervisorId, isActive })
    .returning({ id: schema.teams.id });
  const row = rows[0];
  if (!row) throw new Error("fixture team insert returned no row");
  return row.id;
}

describe("AuthRepo.updatePassword (FR-AUTH-05/07)", () => {
  it("given a new hash, when updated, then the row carries it with must_change_password cleared", async () => {
    await t.db
      .update(schema.users)
      .set({ mustChangePassword: true })
      .where(eq(schema.users.id, user.id));
    const fresh = await hashPassword("brand-new-pw");
    await repo.updatePassword(user.id, fresh, NOW);
    const rows = await t.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id));
    const row = rows[0];
    if (!row) throw new Error("user row vanished");
    expect(row.passwordHash).toBe(fresh);
    expect(row.mustChangePassword).toBe(false);
    expect(row.updatedAt.getTime()).toBe(NOW.getTime());
  });
});

describe("AuthRepo.findUserById (§7 soft delete)", () => {
  it("given a live user id, then the user resolves; given a soft-deleted one, then nothing does", async () => {
    const live = await repo.findUserById(user.id);
    expect(live?.username).toBe(user.username);
    const dead = await insertAuthUser(t.db, { password: "x-not-used" });
    await t.db
      .update(schema.users)
      .set({ deletedAt: NOW })
      .where(eq(schema.users.id, dead.id));
    expect(await repo.findUserById(dead.id)).toBeUndefined();
  });
});

describe("AuthRepo.isTeamSupervisor (§10.2 teamScope)", () => {
  it("given the team's supervisor, then true; given another supervisor, then false", async () => {
    const sup = await insertAuthUser(t.db, { password: "x-not-used" });
    const other = await insertAuthUser(t.db, { password: "x-not-used" });
    const teamA = await insertTeam("team-a", sup.id);
    expect(await repo.isTeamSupervisor(sup.id, teamA)).toBe(true);
    expect(await repo.isTeamSupervisor(other.id, teamA)).toBe(false);
  });

  it("given a team with no supervisor, then nobody is the supervisor", async () => {
    const nobody = await insertTeam("team-none", null);
    const sup = await insertAuthUser(t.db, { password: "x-not-used" });
    expect(await repo.isTeamSupervisor(sup.id, nobody)).toBe(false);
  });

  it("given an inactive team, then even its supervisor is denied", async () => {
    const sup = await insertAuthUser(t.db, { password: "x-not-used" });
    const dead = await insertTeam("team-dead", sup.id, false);
    expect(await repo.isTeamSupervisor(sup.id, dead)).toBe(false);
  });
});
