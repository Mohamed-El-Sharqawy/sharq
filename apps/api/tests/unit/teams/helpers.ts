// Fixtures for the teams/memberships service unit suites (TESTING §4.2;
// roadmap row 1 — written after the landed services). Dates are ISO labels:
// 2026-10-14 is the canonical mid-week Wednesday every suite derives from.
import type { AuditEntry, AuditPort } from "../../../src/modules/auth/types";
import type {
  AdminTeam,
  Membership,
  TeamsRepo,
} from "../../../src/modules/teams/service";
import type { AdminUser } from "../../../src/modules/users/service";

export const MID_WEEK = "2026-10-14"; // Wednesday
export const DAY_BEFORE = "2026-10-13"; // D−1 — the transfer-close day
export const EARLIER = "2026-10-01"; // canonical range start
export const LATER = "2026-10-31"; // canonical end (E = last day)

export function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: crypto.randomUUID(),
    username: "ahmed",
    phone: "+201000000003",
    displayNameAr: "أحمد",
    role: "employee",
    isActive: true,
    mustChangePassword: false,
    version: 1,
    ...overrides,
  };
}

export function makeTeam(overrides: Partial<AdminTeam> = {}): AdminTeam {
  return {
    id: crypto.randomUUID(),
    nameAr: "الصيانة",
    supervisorId: null,
    isActive: true,
    version: 1,
    ...overrides,
  };
}

export function makeMembership(
  overrides: Partial<Membership> = {},
): Membership {
  return {
    id: crypto.randomUUID(),
    teamId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    validFrom: EARLIER,
    validTo: null,
    version: 1,
    ...overrides,
  };
}

export type AuditSpy = {
  entries: AuditEntry[];
  record: AuditPort["record"];
};

export function makeAudit(): AuditSpy {
  const entries: AuditEntry[] = [];
  return {
    entries,
    async record(entry) {
      entries.push(entry);
    },
  };
}

/** Write ops these suites never drive — fail loudly if a path reaches one. */
export const unreachable = (what: string) => async (): Promise<never> => {
  throw new Error(`${what} is unreachable from these suites`);
};

export function makeTeamsRepo(teams: AdminTeam[]): TeamsRepo {
  return {
    insertTeam: unreachable("insertTeam"),
    async findTeam(id) {
      return teams.find((t) => t.id === id);
    },
    updateTeam: unreachable("updateTeam"),
    listTeams: unreachable("listTeams"),
  };
}
