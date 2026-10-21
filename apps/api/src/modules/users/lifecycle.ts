// FR-AUTH-05 — reset password: a new temp hash with must_change_password,
// and EVERY live session revoked first (an admin reset logs the user out).
// FR-AUTH-06 / EC-12 — deactivate/reactivate: the is_active flip plus a
// revoke on deactivate; history (entries, deductions, memberships) is never
// touched. A no-op on an account already in the target state returns the
// current row without a version bump or audit entry (deliberate: the audit
// trail records state CHANGES, §15).
import { hashPassword } from "../auth/password";
import type { AuditPort } from "../auth/types";
import { generateTempPassword } from "./temp-password";
import type {
  ResetPasswordInput,
  ResetPasswordResult,
  SetActiveInput,
  SetActiveResult,
  UsersRepo,
} from "./types";

export type LifecycleDeps = { repo: UsersRepo; audit: AuditPort };

export async function resetPassword(
  deps: LifecycleDeps,
  input: ResetPasswordInput,
  now: Date,
): Promise<ResetPasswordResult> {
  const user = await deps.repo.findUser(input.userId);
  if (!user) return { ok: false, code: "NOT_FOUND" };

  const tempPassword = generateTempPassword();
  await deps.repo.revokeAllSessions(input.userId, now);
  await deps.repo.setPassword(
    input.userId,
    await hashPassword(tempPassword),
    true,
    now,
  );
  await deps.audit.record({
    action: "users.password_reset",
    entityType: "user",
    entityId: user.id,
    actorId: input.actorId,
    newValue: { mustChangePassword: true },
    note: "temp password set; all sessions revoked",
    ip: null,
  });
  return { ok: true, tempPassword };
}

export async function deactivate(
  deps: LifecycleDeps,
  input: SetActiveInput,
  now: Date,
): Promise<SetActiveResult> {
  return setActive(deps, input, false, now);
}

export async function reactivate(
  deps: LifecycleDeps,
  input: SetActiveInput,
  now: Date,
): Promise<SetActiveResult> {
  return setActive(deps, input, true, now);
}

async function setActive(
  deps: LifecycleDeps,
  input: SetActiveInput,
  isActive: boolean,
  now: Date,
): Promise<SetActiveResult> {
  const current = await deps.repo.findUser(input.userId);
  if (!current) return { ok: false, code: "NOT_FOUND" };
  if (current.isActive === isActive) return { ok: true, user: current };

  // Revoke BEFORE the flip: a crash in between leaves an active account
  // that can simply log back in — never a dead account with live sessions.
  if (!isActive) await deps.repo.revokeAllSessions(input.userId, now);
  const updated = await deps.repo.setActive(
    input.userId,
    isActive,
    input.version,
    now,
  );
  if (updated === "VERSION_CONFLICT") {
    return { ok: false, code: "CONFLICT_VERSION", current };
  }
  await deps.audit.record({
    action: isActive ? "users.reactivate" : "users.deactivate",
    entityType: "user",
    entityId: updated.id,
    actorId: input.actorId,
    oldValue: current,
    newValue: updated,
    ip: null,
  });
  return { ok: true, user: updated };
}
