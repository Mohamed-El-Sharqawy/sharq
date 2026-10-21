// apps/web — /teams/:id orchestration: team row from the list payload,
// live members via the users feature's teamId-filtered page query, and
// the add-member mutation (which doubles as the transfer per FR-ADM-05).
// Derivations live in module-level helpers (pure + under the gates).
import { useCallback, useReducer, useState } from "react";
import type { TeamResponse, UserResponse, UsersPageBody } from "@sharq/schemas";
import { cairoTodayIso } from "../../lib/cairo-today";
import { errorMessage } from "../../lib/sharq-error";
import { useUsersPage } from "../users/queries";
import { useAddTeamMember } from "./mutations";
import { useTeam } from "./queries";
import { initialTeamDetailState, teamDetailReducer } from "./detail.reducer";

type PageLike = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
};

/** Combined screen status: pending while either read loads; the first
 * error wins; "loaded but absent team" = NOT_FOUND. */
function detailStatus(
  teams: PageLike & { data?: { items: TeamResponse[] } },
  members: PageLike,
  team: TeamResponse | undefined,
) {
  return {
    isPending: teams.isPending || members.isPending,
    error: teams.isError ? teams.error : members.isError ? members.error : null,
    notFound: !teams.isPending && !teams.isError && !team,
  };
}

/** Pure derivations: member set, addable options (active, not already
 * in), supervisor lookup. */
function deriveTeamDetail(input: {
  team?: TeamResponse;
  membersPage?: UsersPageBody;
  directory?: UserResponse[];
}) {
  const members = input.team ? (input.membersPage?.items ?? []) : [];
  const memberIds = new Set(members.map((user) => user.id));
  const addableUsers = (input.directory ?? []).filter(
    (user) => user.isActive && !memberIds.has(user.id),
  );
  const supervisor = input.team?.supervisorId
    ? (input.directory ?? []).find(
        (user) => user.id === input.team?.supervisorId,
      )
    : undefined;
  return { members, addableUsers, supervisor };
}

export function useTeamDetail(teamId: string | undefined) {
  const [state, dispatch] = useReducer(teamDetailReducer, undefined, () =>
    initialTeamDetailState(cairoTodayIso()),
  );
  const [dialogError, setDialogError] = useState<string | null>(null);

  const { query: teamsQuery, team } = useTeam(teamId);
  const membersQuery = useUsersPage({
    ...(teamId ? { teamId, pageSize: "100" } : { pageSize: "100" }),
  });
  const directoryQuery = useUsersPage({ pageSize: "100" });

  const { members, addableUsers, supervisor } = deriveTeamDetail({
    team,
    membersPage: membersQuery.data,
    directory: directoryQuery.data?.items,
  });

  const addMember = useAddTeamMember(teamId ?? "");

  const submitAddMember = useCallback(() => {
    if (!teamId || addMember.isPending) return;
    setDialogError(null);
    addMember.mutate(
      { userId: state.addForm.userId, validFrom: state.addForm.validFrom },
      {
        onSuccess: () => dispatch({ type: "dialog/close" }),
        onError: (error) => setDialogError(errorMessage(error)),
      },
    );
  }, [addMember, state.addForm, teamId]);

  const closeDialog = useCallback(() => {
    dispatch({ type: "dialog/close" });
    setDialogError(null);
  }, []);

  const status = detailStatus(teamsQuery, membersQuery, team);
  return {
    team,
    supervisor,
    members,
    isPending: status.isPending,
    notFound: status.notFound || !teamId,
    errorMessage: status.error ? errorMessage(status.error) : null,
    retry: () => {
      void teamsQuery.refetch();
      void membersQuery.refetch();
    },
    addableUsers,
    dialogOpen: state.dialogOpen,
    addForm: state.addForm,
    dialogError,
    isSubmitting: addMember.isPending,
    setAddField: (field: keyof typeof state.addForm, value: string) =>
      dispatch({ type: "add-form/set", field, value }),
    openAdd: () => dispatch({ type: "dialog/open", todayIso: cairoTodayIso() }),
    closeDialog,
    submitAddMember,
  };
}

export type TeamDetail = ReturnType<typeof useTeamDetail>;
