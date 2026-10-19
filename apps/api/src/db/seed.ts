// Seed module v1 (ROADMAP Phase 1 row 5): the deterministic TESTING §15
// persona subset — admin «سيد», supervisor «محمد», 5 employees, team
// «الصيانة», company rate 400 EGP. Later phases grow this into the full
// §15 set (3 teams / 137 employees / periods / adjustments); the shape
// stays: create-if-missing, idempotent, dates derived from one SEED_TODAY.
// Arabic values here are DATA (SPEC §5.6), not interface copy — locales is
// only for UI strings (PROGRESS decision, rows 1-2).
import { eq } from "drizzle-orm";
import { getAppDb } from "./client";
import * as schema from "./schema";

/** Known dev/demo password for every seeded persona (TESTING §15). */
export const SEED_PASSWORD = "Sharq#2026";

type Persona = {
  username: string;
  nameAr: string;
  phone: string;
  role: "employee" | "supervisor" | "admin";
};

const ADMIN: Persona = {
  username: "sayed",
  nameAr: "سيد",
  phone: "+201000000001",
  role: "admin",
};
const SUPERVISOR: Persona = {
  username: "mohamed",
  nameAr: "محمد",
  phone: "+201000000002",
  role: "supervisor",
};
const EMPLOYEES: Persona[] = [
  {
    username: "ahmed",
    nameAr: "أحمد",
    phone: "+201000000003",
    role: "employee",
  },
  {
    username: "khaled",
    nameAr: "خالد",
    phone: "+201000000004",
    role: "employee",
  },
  { username: "nour", nameAr: "نور", phone: "+201000000005", role: "employee" },
  {
    username: "mahmoud",
    nameAr: "محمود",
    phone: "+201000000006",
    role: "employee",
  },
  {
    username: "sara",
    nameAr: "سارة",
    phone: "+201000000007",
    role: "employee",
  },
];

const TEAM_NAME_AR = "الصيانة";
const COMPANY_RATE_MINOR = 40_000; // 400 EGP (SPEC §5.6 seed)

// All seed dates derive from this one point (TESTING §15: "frozen today" so
// the seed never rots). E2E/fixtures may pin it; dev uses the real date.
const today = process.env.SEED_TODAY ?? new Date().toISOString().slice(0, 10);
const membershipStart = offsetDate(-30);
const rateStart = `${today.slice(0, 4)}-01-01`;

function offsetDate(days: number): string {
  const ms = Date.parse(`${today}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

async function seedPersonas(
  db: ReturnType<typeof getAppDb>["db"],
  personas: Persona[],
  passwordHash: string,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const p of personas) {
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, p.username));
    if (existing[0]) {
      ids.set(p.username, existing[0].id);
      continue;
    }
    const rows = await db
      .insert(schema.users)
      .values({
        username: p.username,
        phone: p.phone,
        displayNameAr: p.nameAr,
        passwordHash,
        role: p.role,
      })
      .returning({ id: schema.users.id });
    const row = rows[0];
    if (row) ids.set(p.username, row.id);
  }
  return ids;
}

export async function runSeed(): Promise<void> {
  const { db } = getAppDb();
  const passwordHash = await Bun.password.hash(SEED_PASSWORD);

  const ids = await seedPersonas(
    db,
    [ADMIN, SUPERVISOR, ...EMPLOYEES],
    passwordHash,
  );
  const adminId = ids.get(ADMIN.username);
  const supervisorId = ids.get(SUPERVISOR.username);

  let teamId: string | undefined;
  const existingTeam = await db
    .select()
    .from(schema.teams)
    .where(eq(schema.teams.nameAr, TEAM_NAME_AR));
  if (existingTeam[0]) {
    teamId = existingTeam[0].id;
  } else {
    const rows = await db
      .insert(schema.teams)
      .values({ nameAr: TEAM_NAME_AR, supervisorId })
      .returning({ id: schema.teams.id });
    teamId = rows[0]?.id;
  }

  if (teamId && supervisorId) {
    for (const employee of EMPLOYEES) {
      const userId = ids.get(employee.username);
      if (!userId) continue;
      const member = await db
        .select()
        .from(schema.teamMemberships)
        .where(eq(schema.teamMemberships.userId, userId));
      if (!member[0]) {
        await db
          .insert(schema.teamMemberships)
          .values({ teamId, userId, validFrom: membershipStart });
      }
    }
  }

  const rate = await db
    .select()
    .from(schema.payRates)
    .where(eq(schema.payRates.scopeKey, "company"));
  if (!rate[0] && adminId) {
    await db.insert(schema.payRates).values({
      scopeType: "company",
      scopeKey: "company",
      amountMinor: COMPANY_RATE_MINOR,
      validFrom: rateStart,
      createdBy: adminId,
      note: "seed: company base rate 400 EGP (SPEC 5.6)",
    });
  }
}

if (import.meta.main) {
  const { client } = getAppDb();
  await runSeed();
  await client.end();
  console.log(
    "seed v1 applied: admin sayed, supervisor mohamed, 5 employees, team الصيانة, company rate 400 EGP",
  );
}
