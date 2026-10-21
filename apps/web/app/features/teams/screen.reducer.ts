// apps/web — /teams screen state: pagination + the create-team dialog
// form (SPEC §9.2: state machine → reducer; §11 teams row — «اعمل فريق»).
export type CreateTeamForm = { nameAr: string; supervisorId: string };

export type TeamsScreenState = {
  page: number;
  dialogOpen: boolean;
  createForm: CreateTeamForm;
};

export const initialTeamsScreenState: TeamsScreenState = {
  page: 1,
  dialogOpen: false,
  createForm: { nameAr: "", supervisorId: "" },
};

export type TeamsScreenAction =
  | { type: "page/set"; page: number }
  | { type: "dialog/open" }
  | { type: "dialog/close" }
  | { type: "create-form/set"; field: keyof CreateTeamForm; value: string };

export function teamsScreenReducer(
  state: TeamsScreenState,
  action: TeamsScreenAction,
): TeamsScreenState {
  switch (action.type) {
    case "page/set":
      return { ...state, page: Math.max(1, action.page) };
    case "dialog/open":
      return { ...state, dialogOpen: true };
    case "dialog/close":
      return {
        ...state,
        dialogOpen: false,
        createForm: initialTeamsScreenState.createForm,
      };
    case "create-form/set":
      return {
        ...state,
        createForm: { ...state.createForm, [action.field]: action.value },
      };
  }
}
