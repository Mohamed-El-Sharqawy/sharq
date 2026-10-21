// FR-ADM-06 — paged user search. The pagination clamps live here (the
// service is the re-validation layer, §10.3): pageSize ≤ 100 per §10.4.
// q matches display name or phone; teamId keeps only users whose membership
// is live on `today` (valid_to inclusive — FR-ADM-04, E is the last day).
import { PAGE_DEFAULT, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from "@sharq/schemas";
import type { ListUsersInput, UsersPage, UsersRepo } from "./types";

export async function listUsers(
  repo: UsersRepo,
  input: ListUsersInput,
): Promise<UsersPage> {
  const pageSize = Math.min(input.pageSize ?? PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);
  const page = input.page ?? PAGE_DEFAULT;
  const { items, total } = await repo.listUsers({
    offset: (page - 1) * pageSize,
    limit: pageSize,
    q: input.q,
    role: input.role,
    teamId: input.teamId,
    today: input.today,
  });
  return { items, page, pageSize, total, hasNext: page * pageSize < total };
}
