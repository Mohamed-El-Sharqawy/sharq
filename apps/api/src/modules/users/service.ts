// SPEC §10.1 — the users service surface: one factory the plugins (roadmap
// row 4) consume; every operation is a standalone function over mockable
// ports (TESTING §4.2). Audit actions follow lib/audit.ts §15 naming.
import type { AuditPort } from "../auth/types";
import { createUser } from "./create-user";
import { deactivate, reactivate, resetPassword } from "./lifecycle";
import { listUsers } from "./list-users";
import { updateUser } from "./update-user";
import type {
  CreateUserInput,
  CreateUserResult,
  ListUsersInput,
  ResetPasswordInput,
  ResetPasswordResult,
  SetActiveInput,
  SetActiveResult,
  UpdateUserInput,
  UpdateUserResult,
  UsersPage,
  UsersRepo,
} from "./types";

export type UsersServiceDeps = { repo: UsersRepo; audit: AuditPort };

export type {
  AdminUser,
  CreateUserInput,
  CreateUserResult,
  DuplicateField,
  ListUsersInput,
  ResetPasswordInput,
  ResetPasswordResult,
  SetActiveInput,
  SetActiveResult,
  UpdateUserInput,
  UpdateUserResult,
  UsersPage,
  UsersRepo,
} from "./types";

export function createUsersService(deps: UsersServiceDeps) {
  return {
    createUser: (input: CreateUserInput): Promise<CreateUserResult> =>
      createUser(deps, input),
    updateUser: (
      input: UpdateUserInput,
      now: Date,
    ): Promise<UpdateUserResult> => updateUser(deps, input, now),
    resetPassword: (
      input: ResetPasswordInput,
      now: Date,
    ): Promise<ResetPasswordResult> => resetPassword(deps, input, now),
    deactivate: (input: SetActiveInput, now: Date): Promise<SetActiveResult> =>
      deactivate(deps, input, now),
    reactivate: (input: SetActiveInput, now: Date): Promise<SetActiveResult> =>
      reactivate(deps, input, now),
    listUsers: (input: ListUsersInput): Promise<UsersPage> =>
      listUsers(deps.repo, input),
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
