// apps/web — one team card in the /teams list (§11 "Card list"). Shows
// the team name + supervisor; the whole card links to the detail screen.
import { TEAM_SUPERVISOR_LABEL, TEAM_SUPERVISOR_NONE } from "@sharq/locales";
import type { UserResponse } from "@sharq/schemas";
import { Link } from "react-router";
import type { TeamRow } from "../queries";

export function TeamCard({
  team,
  supervisor,
}: {
  team: TeamRow;
  supervisor?: UserResponse;
}) {
  return (
    <li>
      <Link
        to={`/teams/${team.id}`}
        viewTransition
        data-slot="team-card"
        className="block rounded-lg border border-border bg-card p-4 hover:bg-muted/40"
      >
        <span className="font-medium">{team.nameAr}</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {TEAM_SUPERVISOR_LABEL}:{" "}
          {supervisor ? supervisor.displayNameAr : TEAM_SUPERVISOR_NONE}
        </span>
      </Link>
    </li>
  );
}
