// apps/web — /users screen state (SPEC §9.2: state machine → reducer).
// One home for search/pagination/dialog state so the view stays props-only
// and no component holds scattered useState (§9.8's ≤2 rule).
import type { AuthUserResponse, UserResponse } from "@sharq/schemas";

export type UserLifecycleIntent = "reset" | "deactivate" | "reactivate";

/** The confirm-dialog payload both users screens share. */
export type UserConfirmDialog = {
  kind: "confirm";
  intent: UserLifecycleIntent;
  user: UserResponse;
};

export type UsersDialog =
  | { kind: "none" }
  | { kind: "create" }
  | UserConfirmDialog
  | { kind: "temp"; tempPassword: string };

export type CreateUserForm = {
  username: string;
  phone: string;
  displayNameAr: string;
  role: AuthUserResponse["role"];
};

export type UsersScreenState = {
  searchDraft: string;
  appliedQ: string;
  page: number;
  dialog: UsersDialog;
  createForm: CreateUserForm;
};

export const initialUsersScreenState: UsersScreenState = {
  searchDraft: "",
  appliedQ: "",
  page: 1,
  dialog: { kind: "none" },
  createForm: { username: "", phone: "", displayNameAr: "", role: "employee" },
};

export type UsersScreenAction =
  | { type: "search/draft"; value: string }
  | { type: "search/submit" }
  | { type: "page/set"; page: number }
  | { type: "dialog/open-create" }
  | {
      type: "dialog/open-confirm";
      intent: UserLifecycleIntent;
      user: UserResponse;
    }
  | { type: "dialog/temp-password"; tempPassword: string }
  | { type: "dialog/close" }
  | { type: "create-form/set"; field: keyof CreateUserForm; value: string };

function applyRole(form: CreateUserForm, value: string): CreateUserForm {
  return value === "employee" || value === "supervisor" || value === "admin"
    ? { ...form, role: value }
    : form;
}

export function usersScreenReducer(
  state: UsersScreenState,
  action: UsersScreenAction,
): UsersScreenState {
  switch (action.type) {
    case "search/draft":
      return { ...state, searchDraft: action.value };
    case "search/submit":
      // A new search restarts from the first page (§10.4 pagination).
      return { ...state, appliedQ: state.searchDraft.trim(), page: 1 };
    case "page/set":
      return { ...state, page: Math.max(1, action.page) };
    case "dialog/open-create":
      return { ...state, dialog: { kind: "create" } };
    case "dialog/open-confirm":
      return {
        ...state,
        dialog: { kind: "confirm", intent: action.intent, user: action.user },
      };
    case "dialog/temp-password":
      return {
        ...state,
        dialog: { kind: "temp", tempPassword: action.tempPassword },
      };
    case "dialog/close":
      return {
        ...state,
        dialog: { kind: "none" },
        createForm: initialUsersScreenState.createForm,
      };
    case "create-form/set": {
      const { field, value } = action;
      if (field === "role")
        return { ...state, createForm: applyRole(state.createForm, value) };
      return { ...state, createForm: { ...state.createForm, [field]: value } };
    }
  }
}
