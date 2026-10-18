// SPEC §10.2 — login semantics. Wrong password, unknown identifier and
// deactivated account all return the SAME generic code (no user enumeration,
// FR-AUTH-01/FR-AUTH-08, EC-25); failures advance the lockout counter; the
// 5th consecutive failure locks the identifier and is audited (§10.2).
import { defaultSettingValues } from "@sharq/schemas";
import { LOCKOUT_MAX_FAILURES, type LockoutStore } from "./lockout";
import { verifyPassword } from "./password";
import { generateSessionToken, sha256Hex } from "./token";
import { sessionExpiry } from "./session";
import type {
  AuthRepo,
  AuthUserWithHash,
  AuditPort,
  LoginInput,
  LoginResult,
} from "./types";

export type LoginDeps = {
  repo: AuthRepo;
  lockout: LockoutStore;
  audit: AuditPort;
  /** Pins the window in tests; prod reads the registry default (240 min). */
  idleMinutes?: number;
};

const idleMinutes = (deps: LoginDeps) =>
  deps.idleMinutes ?? defaultSettingValues()["security.sessionIdleMinutes"];

export async function login(
  deps: LoginDeps,
  input: LoginInput,
  now: Date,
): Promise<LoginResult> {
  if (deps.lockout.isLocked(input.identifier, now)) {
    return rateLimited(deps.lockout, input.identifier, now);
  }

  const user = await deps.repo.findUserByIdentifier(input.identifier);
  const passwordOk = user
    ? await verifyPassword(input.password, user.passwordHash)
    : false;

  if (!user || !passwordOk) return failAndCount(deps, input, now, user);
  if (!user.isActive) return denyDisabled(deps, input, now, user);

  deps.lockout.reset(input.identifier);
  const token = generateSessionToken();
  const expiresAt = sessionExpiry(now, idleMinutes(deps));
  await deps.repo.insertSession({
    userId: user.id,
    tokenHash: sha256Hex(token),
    lastSeenAt: now,
    expiresAt,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
  });
  const safeUser = { ...user };
  delete (safeUser as Partial<AuthUserWithHash>).passwordHash;
  return {
    ok: true,
    token,
    user: safeUser,
    expiresAt,
    mustChangePassword: user.mustChangePassword,
  };
}
// Locked identifier: same generic envelope family, but with the retry hint.
function rateLimited(
  lockout: LockoutStore,
  identifier: string,
  now: Date,
): LoginResult {
  const until = lockout.lockedUntil(identifier);
  const retryAfterSeconds = until
    ? Math.ceil((until.getTime() - now.getTime()) / 1000)
    : 0;
  return { ok: false, code: "RATE_LIMITED", retryAfterSeconds };
}

// Generic failure, counted; the 5th consecutive failure locks the identifier
// and is audited (§10.2 "lockout 5 fails → 15 min (audited)").
async function failAndCount(
  deps: LoginDeps,
  input: LoginInput,
  now: Date,
  user: AuthUserWithHash | undefined,
): Promise<LoginResult> {
  const wasLocked = deps.lockout.isLocked(input.identifier, now);
  deps.lockout.recordFailure(input.identifier, now);
  if (!wasLocked && deps.lockout.isLocked(input.identifier, now)) {
    await deps.audit.record({
      action: "auth.lockout",
      entityType: "user",
      entityId: user?.id ?? input.identifier,
      actorId: user?.id ?? null,
      note: `identifier locked after ${LOCKOUT_MAX_FAILURES} failures: ${input.identifier}`,
      ip: input.ip ?? null,
    });
  }
  return { ok: false, code: "INVALID_CREDENTIALS" };
}

// FR-AUTH-08 / EC-25 — deactivated account: same generic failure, attempt
// audited, counter advanced (brute-forcing a dead account locks too).
async function denyDisabled(
  deps: LoginDeps,
  input: LoginInput,
  now: Date,
  user: AuthUserWithHash,
): Promise<LoginResult> {
  deps.lockout.recordFailure(input.identifier, now);
  await deps.audit.record({
    action: "auth.login_denied",
    entityType: "user",
    entityId: user.id,
    actorId: user.id,
    note: "login attempt on deactivated account",
    ip: input.ip ?? null,
  });
  return { ok: false, code: "INVALID_CREDENTIALS" };
}
