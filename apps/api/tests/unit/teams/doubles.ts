// In-memory repo doubles mirroring the drizzle repositories' pinned
// semantics (membership-repository.ts): reads return snapshots (the
// service's `open` reference must never mutate under it), writes bump
// version = expected + 1, a version miss is VERSION_CONFLICT, and the
// endWith/insertWith knobs force the repo-level outcomes ("OVERLAP" = the
// §7 exclusion backstop) the service must translate to §10.4 codes.
import type { MembershipDeps } from "../../../src/modules/teams/memberships";
import type {
  AdminTeam,
  Membership,
  MembershipsRepo,
  MembershipsTx,
} from "../../../src/modules/teams/service";
import type { AdminUser, UsersRepo } from "../../../src/modules/users/service";
import {
  makeAudit,
  makeTeamsRepo,
  unreachable,
  type AuditSpy,
} from "./helpers";

export type MembershipInput = Parameters<MembershipsTx["insertMembership"]>[0];

export type MembershipCalls = {
  ended: {
    id: string;
    validTo: string | null;
    expectedVersion: number;
    inTx: boolean;
  }[];
  inserted: { input: MembershipInput; inTx: boolean }[];
  txOpened: number;
};

/** Repo-level outcomes the service must map — the double never throws. */
export type ForcedEnd = "VERSION_CONFLICT" | "OVERLAP";
export type Knobs = { endWith?: ForcedEnd; insertWith?: "OVERLAP" };

export function makeUsersRepo(users: AdminUser[]): UsersRepo {
  return {
    insertUser: unreachable("insertUser"),
    async findUser(id) {
      return users.find((u) => u.id === id);
    },
    updateUser: unreachable("updateUser"),
    setPassword: unreachable("setPassword"),
    setActive: unreachable("setActive"),
    revokeAllSessions: unreachable("revokeAllSessions"),
    listUsers: unreachable("listUsers"),
  };
}

export function makeMembershipsDouble(rows: Membership[], knobs: Knobs = {}) {
  const calls: MembershipCalls = { ended: [], inserted: [], txOpened: 0 };

  function ops(inTx: boolean): MembershipsTx {
    return {
      async findMembership(teamId, membershipId) {
        const row = rows.find(
          (m) => m.id === membershipId && m.teamId === teamId,
        );
        return row ? { ...row } : undefined;
      },
      async listByUser(userId) {
        return rows
          .filter((m) => m.userId === userId)
          .sort((a, b) => a.validFrom.localeCompare(b.validFrom))
          .map((m) => ({ ...m }));
      },
      async endMembership(id, validTo, expectedVersion) {
        calls.ended.push({ id, validTo, expectedVersion, inTx });
        if (knobs.endWith) return knobs.endWith;
        const row = rows.find((m) => m.id === id);
        if (!row || row.version !== expectedVersion) return "VERSION_CONFLICT";
        row.validTo = validTo;
        row.version = expectedVersion + 1;
        return { ...row };
      },
      async insertMembership(input) {
        calls.inserted.push({ input, inTx });
        if (knobs.insertWith) return knobs.insertWith;
        const row: Membership = {
          id: crypto.randomUUID(),
          ...input,
          validTo: null,
          version: 1,
        };
        rows.push(row);
        return { ...row };
      },
    };
  }

  const repo: MembershipsRepo = {
    ...ops(false),
    async tx(fn) {
      calls.txOpened += 1;
      return fn(ops(true));
    },
  };
  return { repo, rows, calls };
}

/** The membership service deps bundle: real finders over fixtures plus the
 * double; returns the call log and audit spy for the suites to assert on. */
export function membershipService(parts: {
  teams: AdminTeam[];
  users: AdminUser[];
  memberships: Membership[];
  knobs?: Knobs;
}): { deps: MembershipDeps; calls: MembershipCalls; audit: AuditSpy } {
  const memberships = makeMembershipsDouble(parts.memberships, parts.knobs);
  const audit = makeAudit();
  return {
    deps: {
      teams: makeTeamsRepo(parts.teams),
      users: makeUsersRepo(parts.users),
      memberships: memberships.repo,
      audit,
    },
    calls: memberships.calls,
    audit,
  };
}
