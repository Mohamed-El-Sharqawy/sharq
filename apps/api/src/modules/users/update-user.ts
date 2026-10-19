// PATCH /api/users/:id rules (§10.6) — profile edits under optimistic
// concurrency (§10.4: mismatch → CONFLICT_VERSION + current row) with EC-23
// duplicate mapping on phone. Username is immutable (identifier stability);
// active state changes go through /deactivate · /reactivate instead.
import type { AuditPort } from "../auth/types";
import type { UpdateUserInput, UpdateUserResult, UsersRepo } from "./types";

export type UpdateUserDeps = { repo: UsersRepo; audit: AuditPort };

export async function updateUser(
  deps: UpdateUserDeps,
  input: UpdateUserInput,
  now: Date,
): Promise<UpdateUserResult> {
  const current = await deps.repo.findUser(input.userId);
  if (!current) return { ok: false, code: "NOT_FOUND" };

  const updated = await deps.repo.updateUser(
    input.userId,
    input.patch,
    input.version,
    now,
  );
  if (updated === "VERSION_CONFLICT") {
    return { ok: false, code: "CONFLICT_VERSION", current };
  }
  if ("duplicate" in updated) {
    return { ok: false, code: "DUPLICATE", field: updated.duplicate };
  }
  await deps.audit.record({
    action: "users.update",
    entityType: "user",
    entityId: updated.id,
    actorId: input.actorId,
    oldValue: current,
    newValue: updated,
    ip: null,
  });
  return { ok: true, user: updated };
}
