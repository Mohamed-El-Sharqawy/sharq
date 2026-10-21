// apps/web — /teams screen view (SPEC §11 teams row; §9.9 shared states;
// «اعمل فريق» is the §11-verbatim create CTA).
import { TEAMS_CREATE, TEAMS_EMPTY, TEAMS_TITLE } from "@sharq/locales";
import {
  Button,
  EmptyState,
  ErrorState,
  ListPagination,
  LoadingState,
} from "@sharq/ui";
import type { UserResponse } from "@sharq/schemas";
import { CreateTeamDialog } from "./components/create-team-dialog";
import { TeamCard } from "./components/team-card";
import type { TeamsScreen } from "./logic";
import type { TeamRow } from "./queries";

function TeamsList({
  teams,
  users,
}: {
  teams: TeamRow[];
  users: UserResponse[] | undefined;
}) {
  const byId = new Map((users ?? []).map((user) => [user.id, user]));
  return (
    <ul className="space-y-2">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          supervisor={
            team.supervisorId ? byId.get(team.supervisorId) : undefined
          }
        />
      ))}
    </ul>
  );
}

export function TeamsView({ screen }: { screen: TeamsScreen }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{TEAMS_TITLE}</h1>
        <Button onClick={screen.openCreate}>{TEAMS_CREATE}</Button>
      </div>
      {screen.isPending ? (
        <LoadingState rows={4} />
      ) : screen.errorMessage ? (
        <ErrorState message={screen.errorMessage} onRetry={screen.retry} />
      ) : !screen.list || screen.list.items.length === 0 ? (
        <EmptyState message={TEAMS_EMPTY} />
      ) : (
        <>
          <TeamsList teams={screen.list.items} users={screen.directory} />
          <ListPagination
            total={screen.list.total}
            hasPrev={screen.pagination.hasPrev}
            hasNext={screen.pagination.hasNext}
            onPrev={screen.pagination.prev}
            onNext={screen.pagination.next}
          />
        </>
      )}
      <CreateTeamDialog
        open={screen.dialogOpen}
        form={screen.createForm}
        supervisors={screen.supervisors}
        error={screen.dialogError}
        submitting={screen.isSubmitting}
        onField={screen.setCreateField}
        onSubmit={screen.submitCreate}
        onClose={screen.closeDialog}
      />
    </main>
  );
}
