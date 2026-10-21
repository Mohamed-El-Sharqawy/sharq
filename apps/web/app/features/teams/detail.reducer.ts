// apps/web — /teams/:id screen state: the add-member dialog form.
// End-membership/transfer READBACK is deferred (no memberships read
// endpoint — §10.6 gap flagged in PROGRESS 2026-10-22); adding a member
// IS the transfer path (FR-ADM-05 via POST members).
export type AddMemberForm = { userId: string; validFrom: string };

export type TeamDetailState = {
  dialogOpen: boolean;
  addForm: AddMemberForm;
};

export function initialTeamDetailState(todayIso: string): TeamDetailState {
  return {
    dialogOpen: false,
    addForm: { userId: "", validFrom: todayIso },
  };
}

export type TeamDetailAction =
  | { type: "dialog/open"; todayIso: string }
  | { type: "dialog/close" }
  | { type: "add-form/set"; field: keyof AddMemberForm; value: string };

export function teamDetailReducer(
  state: TeamDetailState,
  action: TeamDetailAction,
): TeamDetailState {
  switch (action.type) {
    case "dialog/open":
      // Each open resets the date default to Cairo today (SPEC §7 dates).
      return {
        ...state,
        dialogOpen: true,
        addForm: { userId: "", validFrom: action.todayIso },
      };
    case "dialog/close":
      return { ...state, dialogOpen: false };
    case "add-form/set":
      return {
        ...state,
        addForm: { ...state.addForm, [action.field]: action.value },
      };
  }
}
