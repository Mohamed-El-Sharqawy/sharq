// GET /api/teams — paged team list (§10.6: "teams"; shape per §10.4).
// No filters in v1 — the admin team list is small; filters arrive with a
// real screen need (YAGNI, §9.1).
import { PAGE_DEFAULT, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from "@sharq/schemas";
import type { ListTeamsInput, TeamsPage, TeamsRepo } from "./types";

export async function listTeams(
  repo: TeamsRepo,
  input: ListTeamsInput,
): Promise<TeamsPage> {
  const pageSize = Math.min(input.pageSize ?? PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);
  const page = input.page ?? PAGE_DEFAULT;
  const { items, total } = await repo.listTeams({
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });
  return { items, page, pageSize, total, hasNext: page * pageSize < total };
}
