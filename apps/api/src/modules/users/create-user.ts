// FR-AUTH-04 — create user: the server mints the temp password and hashes
// it; the account starts with must_change_password = true (the FR-AUTH-05
// round trip applies to any temp password). Audited users.create with the
// new row (§15 old/new; old is null on creation). EC-23 duplicates are a
// designed result carrying the conflicting field for the Arabic message.
import { hashPassword } from "../auth/password";
import type { AuditPort } from "../auth/types";
import { generateTempPassword } from "./temp-password";
import type { CreateUserInput, CreateUserResult, UsersRepo } from "./types";

export type CreateUserDeps = { repo: UsersRepo; audit: AuditPort };

// No `now` parameter — created_at/updated_at are column defaults (the
// service signature stays uniform across the mutators that need one).
export async function createUser(
  deps: CreateUserDeps,
  input: CreateUserInput,
): Promise<CreateUserResult> {
  const tempPassword = generateTempPassword();
  const inserted = await deps.repo.insertUser({
    username: input.username,
    phone: input.phone ?? null,
    displayNameAr: input.displayNameAr,
    role: input.role,
    passwordHash: await hashPassword(tempPassword),
    mustChangePassword: true,
  });
  if ("duplicate" in inserted) {
    return { ok: false, code: "DUPLICATE", field: inserted.duplicate };
  }
  await deps.audit.record({
    action: "users.create",
    entityType: "user",
    entityId: inserted.id,
    actorId: input.actorId,
    newValue: inserted,
    ip: null,
  });
  return { ok: true, user: inserted, tempPassword };
}
