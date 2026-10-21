// apps/web — /users/:id screen state. Same dialog machine as the list
// screen minus create: confirm (reset/deactivate/reactivate) → temp
// password reveal. The profile itself comes from the users list query
// (§10.6 has no GET /api/users/:id — gap flagged in PROGRESS 2026-10-22;
// the audit-backed history view lands in Phase 8).
import type { UserConfirmDialog } from "./screen.reducer";

export type UserDetailDialog =
  { kind: "none" } | UserConfirmDialog | { kind: "temp"; tempPassword: string };

export type UserDetailState = { dialog: UserDetailDialog };

export const initialUserDetailState: UserDetailState = {
  dialog: { kind: "none" },
};

export type UserDetailAction =
  | {
      type: "dialog/open-confirm";
      intent: UserConfirmDialog["intent"];
      user: UserConfirmDialog["user"];
    }
  | { type: "dialog/temp-password"; tempPassword: string }
  | { type: "dialog/close" };

export function userDetailReducer(
  state: UserDetailState,
  action: UserDetailAction,
): UserDetailState {
  switch (action.type) {
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
      return { ...state, dialog: { kind: "none" } };
  }
}
