// apps/web — /teams screen orchestration (SPEC §9.4 logic.ts). The
// supervisor picker options come from the users feature's page query
// (admin-only surface; inactive users can't be assigned — the service
// rejects them with INACTIVE_USER/422, mirrored client-side by filtering).
import { useCallback, useReducer, useState } from "react";
import { errorMessage } from "../../lib/sharq-error";
import { useUsersPage } from "../users/queries";
import { useCreateTeam } from "./mutations";
import { useTeamsPage } from "./queries";
import { initialTeamsScreenState, teamsScreenReducer } from "./screen.reducer";

export function useTeamsScreen() {
  const [state, dispatch] = useReducer(
    teamsScreenReducer,
    initialTeamsScreenState,
  );
  const [dialogError, setDialogError] = useState<string | null>(null);

  const listQuery = useTeamsPage({
    ...(state.page > 1 ? { page: String(state.page) } : {}),
  });
  const usersQuery = useUsersPage({ pageSize: "100" });
  const supervisors =
    usersQuery.data?.items.filter(
      (user) => user.isActive && user.role === "supervisor",
    ) ?? [];

  const create = useCreateTeam();

  const submitCreate = useCallback(() => {
    if (create.isPending) return;
    setDialogError(null);
    create.mutate(
      {
        nameAr: state.createForm.nameAr.trim(),
        ...(state.createForm.supervisorId
          ? { supervisorId: state.createForm.supervisorId }
          : {}),
      },
      {
        onSuccess: () => dispatch({ type: "dialog/close" }),
        onError: (error) => setDialogError(errorMessage(error)),
      },
    );
  }, [create, state.createForm]);

  const closeDialog = useCallback(() => {
    dispatch({ type: "dialog/close" });
    setDialogError(null);
  }, []);

  return {
    list: listQuery.data,
    isPending: listQuery.isPending,
    errorMessage: listQuery.isError ? errorMessage(listQuery.error) : null,
    retry: () => void listQuery.refetch(),
    // The user directory backing supervisor labels on cards (§10.6 has no
    // team-supervisor join — resolution is client-side over one wide page).
    directory: usersQuery.data?.items,
    pagination: {
      page: state.page,
      hasPrev: state.page > 1,
      hasNext: listQuery.data?.hasNext ?? false,
      prev: () => dispatch({ type: "page/set", page: state.page - 1 }),
      next: () => dispatch({ type: "page/set", page: state.page + 1 }),
    },
    supervisors,
    dialogOpen: state.dialogOpen,
    dialogError,
    isSubmitting: create.isPending,
    createForm: state.createForm,
    setCreateField: (field: keyof typeof state.createForm, value: string) =>
      dispatch({ type: "create-form/set", field, value }),
    openCreate: () => dispatch({ type: "dialog/open" }),
    closeDialog,
    submitCreate,
  };
}

export type TeamsScreen = ReturnType<typeof useTeamsScreen>;
