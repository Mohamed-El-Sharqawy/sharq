// SPEC §10.2 / FR-AUTH-07 — change own password: the current password is
// required, the change is audited, and no session is touched (other devices
// stay logged in). must_change_password clears here (FR-AUTH-05 round-trip).
import { hashPassword, verifyPassword } from "./password";
import type { AuditPort, AuthRepo, ChangePasswordResult } from "./types";

export type ChangePasswordDeps = {
  repo: AuthRepo;
  audit: AuditPort;
};

export type ChangePasswordInput = {
  userId: string;
  current: string;
  next: string;
};

export async function changePassword(
  deps: ChangePasswordDeps,
  input: ChangePasswordInput,
  now: Date,
): Promise<ChangePasswordResult> {
  const user = await deps.repo.findUserById(input.userId);
  if (!user) return { ok: false, code: "INVALID_CREDENTIALS" };

  const currentOk = await verifyPassword(input.current, user.passwordHash);
  if (!currentOk) return { ok: false, code: "INVALID_CREDENTIALS" };

  const passwordHash = await hashPassword(input.next);
  await deps.repo.updatePassword(input.userId, passwordHash, now);
  await deps.audit.record({
    action: "auth.password_changed",
    entityType: "user",
    entityId: user.id,
    actorId: user.id,
    note: "owner changed password",
    ip: null,
  });
  return { ok: true };
}
