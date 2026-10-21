// apps/web — the users-screen mutation runners shared by /users (list)
// and /users/:id (profile): create → temp-password reveal, lifecycle
// confirms (FR-AUTH-04/05/06). Screens stay thin dispatchers.
import { useCallback } from "react";
import {
  useCreateUser,
  useResetUserPassword,
  useSetUserActive,
} from "./mutations";
import type { CreateUserForm, UserConfirmDialog } from "./screen.reducer";

type ErrorSink = { onError: (error: unknown) => void };

/** Create runs (FR-AUTH-04): trims the form, sends only a non-empty
 * phone (the body's phone is optional), reveals the temp password. */
export function useCreateUserRun(
  handlers: ErrorSink & { onCreated: (tempPassword: string) => void },
) {
  const create = useCreateUser();
  const submit = useCallback(
    (form: CreateUserForm) => {
      if (create.isPending) return;
      create.mutate(
        {
          username: form.username.trim(),
          displayNameAr: form.displayNameAr.trim(),
          ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
          role: form.role,
        },
        {
          onSuccess: (data) => handlers.onCreated(data.tempPassword),
          onError: handlers.onError,
        },
      );
    },
    [create, handlers],
  );
  return { submit, isSubmitting: create.isPending };
}

/** Lifecycle confirms: reset reveals the minted password; the
 * activate/deactivate flip echoes the row's version (§10.4). */
export function useUserLifecycleRuns(
  handlers: ErrorSink & {
    onTempPassword: (tempPassword: string) => void;
    onClose: () => void;
  },
) {
  const reset = useResetUserPassword();
  const setActive = useSetUserActive();
  const isSubmitting = reset.isPending || setActive.isPending;

  const run = useCallback(
    (dialog: UserConfirmDialog) => {
      if (isSubmitting) return;
      if (dialog.intent === "reset") {
        reset.mutate(dialog.user.id, {
          onSuccess: (data) => handlers.onTempPassword(data.tempPassword),
          onError: handlers.onError,
        });
        return;
      }
      setActive.mutate(
        {
          id: dialog.user.id,
          active: dialog.intent === "reactivate",
          version: dialog.user.version,
        },
        { onSuccess: handlers.onClose, onError: handlers.onError },
      );
    },
    [handlers, isSubmitting, reset, setActive],
  );

  return { run, isSubmitting };
}
