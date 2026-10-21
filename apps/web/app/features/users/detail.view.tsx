// apps/web — /users/:id view: profile fields + lifecycle actions (SPEC
// §11 users row; the history block arrives with the audit read in Phase
// 8). Confirm wording lives in lifecycle-confirm-dialog.tsx (shared with
// the list screen).
import {
  API_ERROR_MESSAGES,
  ROLE_LABELS,
  USERS_ACTIVE,
  USERS_BACK_TO_LIST,
  USERS_INACTIVE,
  USERS_MUST_CHANGE_PASSWORD,
  USER_DEACTIVATE,
  USER_PROFILE_TITLE,
  USER_REACTIVATE,
  USER_RESET_PASSWORD,
} from "@sharq/locales";
import { Button } from "@sharq/ui/components/button";
import { ErrorState, LoadingState } from "@sharq/ui";
import { Link } from "react-router";
import { LifecycleConfirmDialog } from "./components/lifecycle-confirm-dialog";
import { TempPasswordDialog } from "./components/temp-password-dialog";
import type { UserProfile } from "./detail.logic";

function ProfileCard({ profile }: { profile: UserProfile }) {
  const user = profile.user;
  if (!user) return null;
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">{user.displayNameAr}</h2>
        <span
          className={
            user.isActive
              ? "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              : "rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
          }
        >
          {user.isActive ? USERS_ACTIVE : USERS_INACTIVE}
        </span>
      </div>
      <p className="text-sm text-muted-foreground" dir="ltr">
        {user.username}
        {user.phone ? ` · ${user.phone}` : ""}
      </p>
      <p className="text-sm">{ROLE_LABELS[user.role]}</p>
      {user.mustChangePassword ? (
        <p className="text-xs text-muted-foreground">
          {USERS_MUST_CHANGE_PASSWORD}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => profile.openConfirm("reset")}
        >
          {USER_RESET_PASSWORD}
        </Button>
        {user.isActive ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => profile.openConfirm("deactivate")}
          >
            {USER_DEACTIVATE}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => profile.openConfirm("reactivate")}
          >
            {USER_REACTIVATE}
          </Button>
        )}
      </div>
    </div>
  );
}

export function UserDetailView({ profile }: { profile: UserProfile }) {
  const { dialog } = profile;
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">{USER_PROFILE_TITLE}</h1>
      <Link
        to="/users"
        viewTransition
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        {USERS_BACK_TO_LIST}
      </Link>
      {profile.isPending ? (
        <LoadingState rows={4} />
      ) : profile.notFound ? (
        <ErrorState
          message={API_ERROR_MESSAGES.NOT_FOUND}
          onRetry={profile.retry}
        />
      ) : profile.errorMessage ? (
        <ErrorState message={profile.errorMessage} onRetry={profile.retry} />
      ) : (
        <ProfileCard profile={profile} />
      )}
      {dialog.kind === "confirm" ? (
        <LifecycleConfirmDialog
          dialog={dialog}
          submitting={profile.isSubmitting}
          onConfirm={profile.confirmIntent}
          onClose={profile.closeDialog}
        />
      ) : null}
      <TempPasswordDialog
        open={dialog.kind === "temp"}
        tempPassword={dialog.kind === "temp" ? dialog.tempPassword : ""}
        onClose={profile.closeDialog}
      />
    </main>
  );
}
