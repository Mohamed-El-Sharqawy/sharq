// apps/web — /teams/:id view: supervisor + live members + add-member
// (SPEC §11 teams detail row). Member dating (validFrom per member) and
// the transfer-dialog readback are deferred with the memberships read
// endpoint (§10.6 gap, flagged 2026-10-22); memberships written via the
// dialog return their dated row (mutation payload) but aren't listable.
import {
  API_ERROR_MESSAGES,
  ROLE_LABELS,
  TEAM_ADD_MEMBER,
  TEAM_MEMBERS_EMPTY,
  TEAM_MEMBERS_TITLE,
  TEAM_SUPERVISOR_LABEL,
  TEAM_SUPERVISOR_NONE,
  TEAMS_BACK_TO_LIST,
} from "@sharq/locales";
import { Button } from "@sharq/ui/components/button";
import { EmptyState, ErrorState, LoadingState } from "@sharq/ui";
import type { UserResponse } from "@sharq/schemas";
import { Link } from "react-router";
import { AddMemberDialog } from "./components/add-member-dialog";
import type { TeamDetail } from "./detail.logic";

function MemberList({ members }: { members: UserResponse[] }) {
  return (
    <ul className="space-y-2">
      {members.map((user) => (
        <li
          key={user.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3"
        >
          <span className="font-medium">{user.displayNameAr}</span>
          <span className="text-sm text-muted-foreground">
            {ROLE_LABELS[user.role]}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TeamDetailView({ detail }: { detail: TeamDetail }) {
  const { team } = detail;
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">{team?.nameAr}</h1>
      <Link
        to="/teams"
        viewTransition
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        {TEAMS_BACK_TO_LIST}
      </Link>
      {detail.isPending ? (
        <LoadingState rows={4} />
      ) : detail.notFound ? (
        <ErrorState
          message={API_ERROR_MESSAGES.NOT_FOUND}
          onRetry={detail.retry}
        />
      ) : detail.errorMessage ? (
        <ErrorState message={detail.errorMessage} onRetry={detail.retry} />
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              {TEAM_SUPERVISOR_LABEL}:{" "}
              {detail.supervisor
                ? detail.supervisor.displayNameAr
                : TEAM_SUPERVISOR_NONE}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">{TEAM_MEMBERS_TITLE}</h2>
            <Button onClick={detail.openAdd}>{TEAM_ADD_MEMBER}</Button>
          </div>
          {detail.members.length === 0 ? (
            <EmptyState message={TEAM_MEMBERS_EMPTY} />
          ) : (
            <MemberList members={detail.members} />
          )}
        </>
      )}
      <AddMemberDialog
        open={detail.dialogOpen}
        form={detail.addForm}
        users={detail.addableUsers}
        error={detail.dialogError}
        submitting={detail.isSubmitting}
        onField={detail.setAddField}
        onSubmit={detail.submitAddMember}
        onClose={detail.closeDialog}
      />
    </main>
  );
}
