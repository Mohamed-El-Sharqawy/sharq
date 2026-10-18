// SPEC §10.1/§10.2 — auth service port & type layer. The service owns the
// business rules; storage sits behind AuthRepo so units run against mocks
// (TESTING §4.2) and the drizzle implementation (repository.ts) never leaks
// password hashes beyond this boundary.
export type AuthRole = "employee" | "supervisor" | "admin";

/** Service-level user shape — passwordHash is repo-private (AuthUserWithHash). */
export type AuthUser = {
  id: string;
  username: string;
  phone: string | null;
  displayNameAr: string;
  role: AuthRole;
  isActive: boolean;
  mustChangePassword: boolean;
};

export type AuthUserWithHash = AuthUser & { passwordHash: string };

export type AuthSession = {
  id: string;
  userId: string;
  tokenHash: string;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  /** §15 old/new JSON — the before/after of the change (FR-AUD-01/02). */
  oldValue?: unknown;
  newValue?: unknown;
  note?: string | null;
  ip?: string | null;
};

export interface AuditPort {
  record(entry: AuditEntry): Promise<void>;
}

/** Storage port — drizzle mapping lives in repository.ts. */
export interface AuthRepo {
  /** Exact match on username OR phone; soft-deleted rows resolve to nothing. */
  findUserByIdentifier(
    identifier: string,
  ): Promise<AuthUserWithHash | undefined>;
  insertSession(input: {
    userId: string;
    tokenHash: string;
    lastSeenAt: Date;
    expiresAt: Date;
    ip: string | null;
    userAgent: string | null;
  }): Promise<AuthSession>;
  /** Session joined with its owner; undefined when the hash is unknown. */
  findSessionByTokenHash(
    tokenHash: string,
  ): Promise<{ session: AuthSession; user: AuthUser } | undefined>;
  /** Live user by id (soft-deleted resolve to nothing) — change-password path. */
  findUserById(id: string): Promise<AuthUserWithHash | undefined>;
  /** FR-AUTH-05/07: swap the hash and clear must_change_password. */
  updatePassword(id: string, passwordHash: string, now: Date): Promise<void>;
  /** §10.2 teamScope: live team whose supervisor_id is this user. */
  isTeamSupervisor(userId: string, teamId: string): Promise<boolean>;
  touchSession(id: string, lastSeenAt: Date, expiresAt: Date): Promise<void>;
  revokeSession(id: string, revokedAt: Date): Promise<void>;
}

export type LoginInput = {
  identifier: string;
  password: string;
  ip?: string | null;
  userAgent?: string | null;
};

export type LoginResult =
  | {
      ok: true;
      token: string;
      user: AuthUser;
      expiresAt: Date;
      mustChangePassword: boolean;
    }
  // One generic code for wrong password / unknown identifier / disabled
  // account — no user enumeration (FR-AUTH-01, FR-AUTH-08, EC-25).
  | { ok: false; code: "INVALID_CREDENTIALS" }
  | { ok: false; code: "RATE_LIMITED"; retryAfterSeconds: number };

/** FR-AUTH-07 — input + result; wrong current password is the only
 * failure (owner-only call, no enumeration concern). */
export type ChangePasswordInput = {
  userId: string;
  current: string;
  next: string;
};

export type ChangePasswordResult =
  { ok: true } | { ok: false; code: "INVALID_CREDENTIALS" };
