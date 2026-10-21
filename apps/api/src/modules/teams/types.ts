// SPEC §10.1 — team + membership service ports. Memberships are
// effective-dated rows (§7) with INCLUSIVE valid_to semantics: FR-ADM-04
// ends membership at E with E as the member's LAST day; FR-ADM-05 closes
// team A at D−1 and opens B at D. The DB exclusion constraint (daterange
// with [to) bounds) is only the backstop — it cannot see boundary-day
// double-booking — so the service pre-checks overlap on inclusive days.
export type AdminTeam = {
  id: string;
  nameAr: string;
  supervisorId: string | null;
  isActive: boolean;
  version: number;
};

export type Membership = {
  id: string;
  teamId: string;
  userId: string;
  validFrom: string;
  validTo: string | null;
  version: number;
};

export interface TeamsRepo {
  insertTeam(input: {
    nameAr: string;
    supervisorId: string | null;
  }): Promise<AdminTeam>;
  findTeam(id: string): Promise<AdminTeam | undefined>;
  /** Conditional on version; 0 rows = VERSION_CONFLICT. */
  updateTeam(
    id: string,
    patch: { nameAr?: string; supervisorId?: string | null },
    expectedVersion: number,
    now: Date,
  ): Promise<AdminTeam | "VERSION_CONFLICT">;
  listTeams(query: {
    offset: number;
    limit: number;
  }): Promise<{ items: AdminTeam[]; total: number }>;
}

/** Membership ops over a db-or-transaction handle (transaction-scoped). */
export interface MembershipsTx {
  findMembership(
    teamId: string,
    membershipId: string,
  ): Promise<Membership | undefined>;
  /** Every membership row of the user, any team — overlap/transfer math. */
  listByUser(userId: string): Promise<Membership[]>;
  /** End (or reopen with null) — EC-08 exclusion violations → "OVERLAP". */
  endMembership(
    id: string,
    validTo: string | null,
    expectedVersion: number,
  ): Promise<Membership | "VERSION_CONFLICT" | "OVERLAP">;
  /** EC-08/11: a rejected insert comes back as "OVERLAP". */
  insertMembership(input: {
    teamId: string;
    userId: string;
    validFrom: string;
  }): Promise<Membership | "OVERLAP">;
}

export interface MembershipsRepo extends MembershipsTx {
  /** One transaction for the transfer bundle (FR-ADM-05). */
  tx<T>(fn: (tx: MembershipsTx) => Promise<T>): Promise<T>;
}

export type CreateTeamInput = {
  actorId: string;
  nameAr: string;
  supervisorId?: string | null;
};
export type SupervisorProblem = "SUPERVISOR_NOT_FOUND" | "SUPERVISOR_ROLE";
export type CreateTeamResult =
  { ok: true; team: AdminTeam } | { ok: false; code: SupervisorProblem };

export type UpdateTeamInput = {
  actorId: string;
  teamId: string;
  patch: { nameAr?: string; supervisorId?: string | null };
  version: number;
};
export type UpdateTeamResult =
  | { ok: true; team: AdminTeam }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "CONFLICT_VERSION"; current: AdminTeam }
  | { ok: false; code: SupervisorProblem };

export type ListTeamsInput = { page?: number; pageSize?: number };
export type TeamsPage = {
  items: AdminTeam[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
};

export type AddMemberInput = {
  actorId: string;
  teamId: string;
  userId: string;
  validFrom: string;
};
export type AddMemberResult =
  | { ok: true; membership: Membership; transferredFromTeamId: string | null }
  | { ok: false; code: "TEAM_NOT_FOUND" }
  | { ok: false; code: "USER_NOT_FOUND" }
  | { ok: false; code: "INACTIVE_USER" }
  | { ok: false; code: "VALIDATION_FAILED"; field: "validFrom" }
  | { ok: false; code: "DUPLICATE" }
  | { ok: false; code: "CONFLICT_VERSION" };

export type UpdateMemberInput = {
  actorId: string;
  teamId: string;
  membershipId: string;
  validTo?: string | null;
  version: number;
};
export type UpdateMemberResult =
  | { ok: true; membership: Membership }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "VALIDATION_FAILED"; field: "validTo" }
  | { ok: false; code: "DUPLICATE" }
  | { ok: false; code: "CONFLICT_VERSION"; current: Membership };
