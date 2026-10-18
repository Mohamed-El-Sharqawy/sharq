// SPEC §10.2 — session lifecycle: the sliding idle window and revocation.
// FR-AUTH-03: any request against a live session slides lastSeenAt to now
// and recomputes expiresAt from security.sessionIdleMinutes; an expired,
// revoked or unknown token resolves to nothing (the plugin maps that to 401
// AUTH_REQUIRED). FR-AUTH-02: logout revokes the row exactly once.
import { sha256Hex } from "./token";
import type { AuthRepo, AuthSession, AuthUser } from "./types";

/** FR-AUTH-03 — expiry = lastSeenAt + idleMinutes (the sliding window). */
export function sessionExpiry(lastSeenAt: Date, idleMinutes: number): Date {
  return new Date(lastSeenAt.getTime() + idleMinutes * 60_000);
}

/** FR-AUTH-03 — the expiry minute itself is already expired (inclusive). */
export function isSessionExpired(
  session: { expiresAt: Date },
  now: Date,
): boolean {
  return now.getTime() >= session.expiresAt.getTime();
}

export type SessionDeps = {
  repo: AuthRepo;
  idleMinutes: () => number;
};

/** FR-AUTH-03 — live session slides; expired/revoked/unknown → null (401). */
export async function resolveSession(
  deps: SessionDeps,
  token: string,
  now: Date,
): Promise<{ user: AuthUser; session: AuthSession } | null> {
  const found = await deps.repo.findSessionByTokenHash(sha256Hex(token));
  if (!found) return null;
  const { session, user } = found;
  if (session.revokedAt !== null) return null;
  if (isSessionExpired(session, now)) return null;

  const expiresAt = sessionExpiry(now, deps.idleMinutes());
  await deps.repo.touchSession(session.id, now, expiresAt);
  return { user, session: { ...session, lastSeenAt: now, expiresAt } };
}

/** FR-AUTH-02 — revoke the row; unknown or already-revoked is a no-op. */
export async function logout(
  deps: SessionDeps,
  token: string,
  now: Date,
): Promise<void> {
  const found = await deps.repo.findSessionByTokenHash(sha256Hex(token));
  if (!found || found.session.revokedAt !== null) return;
  await deps.repo.revokeSession(found.session.id, now);
}
