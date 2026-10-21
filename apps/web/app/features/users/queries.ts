// apps/web — users feature query keys + hooks (SPEC §9.6: key factory +
// queryOptions + useX). The `pickUsersQuery` derivation keeps query keys
// deterministic (undefined fields never enter the key).
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { ListUsersQuery } from "@sharq/schemas";
import { listUsers } from "./api";

export const usersKeys = {
  all: ["users"] as const,
  list: (query: ListUsersQuery) => ["users", "list", query] as const,
};

/** Shape the wire query so equal intents hash to one cache entry: drop
 * undefined/empty fields and the implicit first page. */
export function pickUsersQuery(query: ListUsersQuery): ListUsersQuery {
  const picked: ListUsersQuery = {};
  if (query.q) picked.q = query.q;
  if (query.role) picked.role = query.role;
  if (query.teamId) picked.teamId = query.teamId;
  if (query.page && query.page !== "1") picked.page = query.page;
  if (query.pageSize) picked.pageSize = query.pageSize;
  return picked;
}

export function usersPageOptions(query: ListUsersQuery) {
  return queryOptions({
    queryKey: usersKeys.list(pickUsersQuery(query)),
    queryFn: () => listUsers(pickUsersQuery(query)),
  });
}

export function useUsersPage(query: ListUsersQuery) {
  return useQuery(usersPageOptions(query));
}
