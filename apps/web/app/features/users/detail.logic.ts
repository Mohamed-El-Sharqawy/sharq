// apps/web — /users/:id orchestration: resolves the profile from the
// users list query (single page ≤100 users, §10.6 read-gap noted in
// detail.reducer.ts) and runs the lifecycle confirms. Role gate happens
// in the route; the server 403s regardless.
import { useCallback, useReducer, useState } from "react";
import { errorMessage } from "../../lib/sharq-error";
import { useUserLifecycleRuns } from "./lifecycle";
import { initialUserDetailState, userDetailReducer } from "./detail.reducer";
import { useUsersPage } from "./queries";
import type { UserLifecycleIntent } from "./screen.reducer";

export function useUserProfile(userId: string | undefined) {
  const [state, dispatch] = useReducer(
    userDetailReducer,
    initialUserDetailState,
  );
  const [dialogError, setDialogError] = useState<string | null>(null);

  const listQuery = useUsersPage({ pageSize: "100" });
  const user = userId
    ? listQuery.data?.items.find((item) => item.id === userId)
    : undefined;

  const lifecycle = useUserLifecycleRuns({
    onTempPassword: (tempPassword) =>
      dispatch({ type: "dialog/temp-password", tempPassword }),
    onClose: () => dispatch({ type: "dialog/close" }),
    onError: (error) => setDialogError(errorMessage(error)),
  });

  const openConfirm = useCallback(
    (intent: UserLifecycleIntent) => {
      if (user) dispatch({ type: "dialog/open-confirm", intent, user });
    },
    [user],
  );

  const closeDialog = useCallback(() => {
    dispatch({ type: "dialog/close" });
    setDialogError(null);
  }, []);

  return {
    user,
    isPending: listQuery.isPending,
    errorMessage: listQuery.isError ? errorMessage(listQuery.error) : null,
    notFound: !listQuery.isPending && !listQuery.isError && !user,
    retry: () => void listQuery.refetch(),
    dialog: state.dialog,
    dialogError,
    isSubmitting: lifecycle.isSubmitting,
    openConfirm,
    closeDialog,
    confirmIntent: () => {
      if (state.dialog.kind === "confirm") lifecycle.run(state.dialog);
    },
  };
}

export type UserProfile = ReturnType<typeof useUserProfile>;
