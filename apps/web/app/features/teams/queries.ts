// apps/web — teams feature query keys + hooks (SPEC §9.6). Team detail
// derives from the list payload (no GET /api/teams/:id — §10.6 gap,
// flagged); a single page covers v1 team counts (pageSize capped at 100
// by §10.4).
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { ListTeamsQuery, TeamResponse } from "@sharq/schemas";
import { listTeams } from "./api";

export const teamsKeys = {
  all: ["teams"] as const,
  list: (query: ListTeamsQuery) => ["teams", "list", query] as const,
};

export function pickTeamsQuery(query: ListTeamsQuery): ListTeamsQuery {
  const picked: ListTeamsQuery = {};
  if (query.page && query.page !== "1") picked.page = query.page;
  if (query.pageSize) picked.pageSize = query.pageSize;
  return picked;
}

export function teamsPageOptions(query: ListTeamsQuery) {
  return queryOptions({
    queryKey: teamsKeys.list(pickTeamsQuery(query)),
    queryFn: () => listTeams(pickTeamsQuery(query)),
  });
}

export function useTeamsPage(query: ListTeamsQuery) {
  return useQuery(teamsPageOptions(query));
}

/** The detail screen's team row — found in the (single wide) list page.
 * undefined until loaded; "loaded but absent" = NOT_FOUND to the caller. */
export function useTeam(teamId: string | undefined) {
  const query = useTeamsPage({ pageSize: "100" });
  const team = teamId
    ? query.data?.items.find((item) => item.id === teamId)
    : undefined;
  return { query, team };
}

export type TeamRow = TeamResponse;
