// Mocked ports for the auth service unit suites (TESTING §4.2: every api
// service method is tested-first against a mocked repository). No Postgres,
// no Docker — these suites run inside the fast unit stage.
import type {
  AuditEntry,
  AuthRepo,
  AuthUser,
} from "../../../src/modules/auth/service";

/** Fixed clock point every suite derives its times from (TESTING §13). */
export const T0 = new Date("2026-10-18T10:00:00Z");

export const minutes = (n: number) => n * 60_000;

/** Service-level user shape + the hash the repo holds privately. */
export type UserWithHash = AuthUser & { passwordHash: string };

export function makeUser(overrides: Partial<UserWithHash> = {}): UserWithHash {
  return {
    id: crypto.randomUUID(),
    username: "ahmed",
    phone: "+201000000003",
    role: "employee",
    isActive: true,
    mustChangePassword: false,
    passwordHash: "fixture-not-a-real-hash",
    ...overrides,
  };
}

export type StoredSession = {
  id: string;
  userId: string;
  tokenHash: string;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type AuditSpy = {
  entries: AuditEntry[];
  record: (e: AuditEntry) => Promise<void>;
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

// In-memory AuthRepo double: real lookup/insert semantics over plain maps,
// every mutation recorded so suites assert the service drove it correctly.
export function makeRepo(users: UserWithHash[]) {
  const sessions = new Map<string, StoredSession>();
  const calls = {
    insertSession: [] as {
      userId: string;
      tokenHash: string;
      lastSeenAt: Date;
      expiresAt: Date;
      ip: string | null;
      userAgent: string | null;
    }[],
    touchSession: [] as { id: string; lastSeenAt: Date; expiresAt: Date }[],
    revoked: [] as { id: string; revokedAt: Date }[],
  };

  const stripHash = (u: UserWithHash): AuthUser => {
    const { passwordHash: _ignored, ...user } = u;
    return user;
  };

  const repo: AuthRepo = {
    async findUserByIdentifier(identifier) {
      return users.find(
        (u) => u.username === identifier || u.phone === identifier,
      );
    },
    async insertSession(input) {
      calls.insertSession.push(input);
      const row: StoredSession = {
        id: crypto.randomUUID(),
        userId: input.userId,
        tokenHash: input.tokenHash,
        lastSeenAt: input.lastSeenAt,
        expiresAt: input.expiresAt,
        revokedAt: null,
      };
      sessions.set(input.tokenHash, row);
      return row;
    },
    async findSessionByTokenHash(tokenHash) {
      const session = sessions.get(tokenHash);
      const user = session && users.find((u) => u.id === session.userId);
      if (!session || !user) return undefined;
      return { session, user: stripHash(user) };
    },
    async touchSession(id, lastSeenAt, expiresAt) {
      calls.touchSession.push({ id, lastSeenAt, expiresAt });
      for (const row of sessions.values()) {
        if (row.id === id) {
          row.lastSeenAt = lastSeenAt;
          row.expiresAt = expiresAt;
        }
      }
    },
    async revokeSession(id, revokedAt) {
      calls.revoked.push({ id, revokedAt });
      for (const row of sessions.values()) {
        if (row.id === id) row.revokedAt = revokedAt;
      }
    },
  };

  return { repo, sessions, calls };
}
