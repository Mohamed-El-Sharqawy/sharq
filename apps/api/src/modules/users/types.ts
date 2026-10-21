// SPEC §10.1 — user-management service ports. AdminUser is the hash-free
// wire twin (+ the version the client echoes back, §10.4); passwordHash
// never crosses this boundary. Results are discriminated unions the plugins
// (roadmap row 4) map to §10.4 envelopes.
import type { AuthUser } from "../auth/types";

export type AdminUser = AuthUser & { version: number };

export type DuplicateField = "username" | "phone";

export interface UsersRepo {
  /** EC-23: username/phone uniqueness is a designed outcome, not an error. */
  insertUser(input: {
    username: string;
    phone: string | null;
    displayNameAr: string;
    role: AuthUser["role"];
    passwordHash: string;
    mustChangePassword: boolean;
  }): Promise<AdminUser | { duplicate: DuplicateField }>;
  /** Live user by id — existence checks + the team service's validations. */
  findUser(id: string): Promise<AdminUser | undefined>;
  updateUser(
    id: string,
    patch: {
      displayNameAr?: string;
      phone?: string | null;
      role?: AuthUser["role"];
    },
    expectedVersion: number,
    now: Date,
  ): Promise<AdminUser | "VERSION_CONFLICT" | { duplicate: DuplicateField }>;
  /** FR-AUTH-05: store a new hash and set/clear must_change_password. */
  setPassword(
    id: string,
    passwordHash: string,
    mustChangePassword: boolean,
    now: Date,
  ): Promise<void>;
  /** FR-AUTH-06: is_active flip only — history is never touched (EC-12). */
  setActive(
    id: string,
    isActive: boolean,
    expectedVersion: number,
    now: Date,
  ): Promise<AdminUser | "VERSION_CONFLICT">;
  /** FR-AUTH-05/06: revoke every still-live session of the user. */
  revokeAllSessions(userId: string, now: Date): Promise<void>;
  /** FR-ADM-06: paged search; teamId = live membership on `today`. */
  listUsers(query: {
    offset: number;
    limit: number;
    q?: string;
    role?: AuthUser["role"];
    teamId?: string;
    today: string;
  }): Promise<{ items: AdminUser[]; total: number }>;
}

export type CreateUserInput = {
  actorId: string;
  username: string;
  phone?: string | null;
  displayNameAr: string;
  role: AuthUser["role"];
};

export type CreateUserResult =
  | { ok: true; user: AdminUser; tempPassword: string }
  | { ok: false; code: "DUPLICATE"; field: DuplicateField };

export type UpdateUserInput = {
  actorId: string;
  userId: string;
  patch: {
    displayNameAr?: string;
    phone?: string | null;
    role?: AuthUser["role"];
  };
  version: number;
};

export type UpdateUserResult =
  | { ok: true; user: AdminUser }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "CONFLICT_VERSION"; current: AdminUser }
  | { ok: false; code: "DUPLICATE"; field: DuplicateField };

export type ResetPasswordInput = { actorId: string; userId: string };
export type ResetPasswordResult =
  { ok: true; tempPassword: string } | { ok: false; code: "NOT_FOUND" };

export type SetActiveInput = {
  actorId: string;
  userId: string;
  version: number;
};
export type SetActiveResult =
  | { ok: true; user: AdminUser }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "CONFLICT_VERSION"; current: AdminUser };

export type ListUsersInput = {
  page?: number;
  pageSize?: number;
  q?: string;
  role?: AuthUser["role"];
  teamId?: string;
  /** Cairo "today" (§7 boundary layer) — an ISO label from the caller. */
  today: string;
};

export type UsersPage = {
  items: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
};
