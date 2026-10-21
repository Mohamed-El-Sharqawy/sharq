// apps/web — /users screen orchestration (SPEC §9.4 logic.ts): composes
// the list query + create/lifecycle runners into the view's props. The
// view stays pure; dialog errors carry the envelope's Arabic (§10.4).
import { useCallback, useReducer, useState } from "react";
import type { ListUsersQuery } from "@sharq/schemas";
import { errorMessage } from "../../lib/sharq-error";
import { useCreateUserRun, useUserLifecycleRuns } from "./lifecycle";
import { useUsersPage } from "./queries";
import {
  initialUsersScreenState,
  usersScreenReducer,
  type UsersScreenState,
  type UserLifecycleIntent,
} from "./screen.reducer";

function usersListQuery(state: UsersScreenState): ListUsersQuery {
  return {
    ...(state.appliedQ ? { q: state.appliedQ } : {}),
    ...(state.page > 1 ? { page: String(state.page) } : {}),
  };
}

function paginationProps(
  state: UsersScreenState,
  dispatch: (action: Parameters<typeof usersScreenReducer>[1]) => void,
  hasNext: boolean,
) {
  return {
    page: state.page,
    hasPrev: state.page > 1,
    hasNext,
    prev: () => dispatch({ type: "page/set", page: state.page - 1 }),
    next: () => dispatch({ type: "page/set", page: state.page + 1 }),
  };
}

function searchProps(
  state: UsersScreenState,
  dispatch: (action: Parameters<typeof usersScreenReducer>[1]) => void,
) {
  return {
    value: state.searchDraft,
    onChange: (value: string) => dispatch({ type: "search/draft", value }),
    onSubmit: () => dispatch({ type: "search/submit" }),
  };
}

export function useUsersScreen() {
  const [state, dispatch] = useReducer(
    usersScreenReducer,
    initialUsersScreenState,
  );
  const [dialogError, setDialogError] = useState<string | null>(null);

  const listQuery = useUsersPage(usersListQuery(state));
  const create = useCreateUserRun({
    onCreated: (tempPassword) =>
      dispatch({ type: "dialog/temp-password", tempPassword }),
    onError: (error) => setDialogError(errorMessage(error)),
  });
  const lifecycle = useUserLifecycleRuns({
    onTempPassword: (tempPassword) =>
      dispatch({ type: "dialog/temp-password", tempPassword }),
    onClose: () => dispatch({ type: "dialog/close" }),
    onError: (error) => setDialogError(errorMessage(error)),
  });
  const isSubmitting = create.isSubmitting || lifecycle.isSubmitting;

  const openConfirm = useCallback(
    (intent: UserLifecycleIntent, userId: string) => {
      const user = listQuery.data?.items.find((item) => item.id === userId);
      if (user) dispatch({ type: "dialog/open-confirm", intent, user });
    },
    [listQuery.data],
  );

  const closeDialog = useCallback(() => {
    dispatch({ type: "dialog/close" });
    setDialogError(null);
  }, []);

  return {
    list: listQuery.data,
    isPending: listQuery.isPending,
    errorMessage: listQuery.isError ? errorMessage(listQuery.error) : null,
    retry: () => void listQuery.refetch(),
    search: searchProps(state, dispatch),
    pagination: paginationProps(
      state,
      dispatch,
      listQuery.data?.hasNext ?? false,
    ),
    dialog: state.dialog,
    dialogError,
    isSubmitting,
    createForm: state.createForm,
    setCreateField: (field: keyof typeof state.createForm, value: string) =>
      dispatch({ type: "create-form/set", field, value }),
    openCreate: () => dispatch({ type: "dialog/open-create" }),
    openConfirm,
    closeDialog,
    submitCreate: () => create.submit(state.createForm),
    confirmIntent: () => {
      if (state.dialog.kind === "confirm") lifecycle.run(state.dialog);
    },
  };
}

export type UsersScreen = ReturnType<typeof useUsersScreen>;
