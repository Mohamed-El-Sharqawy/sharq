// apps/web — users feature mutations (SPEC §9.6 invalidation map: user
// mutations → ['users'] + ['teams'] + ['memberships'] — memberships have
// no dedicated key yet (no read endpoint); member lists ride ['users']
// with a teamId param, and a role/active flip can change what teams show,
// so both roots invalidate).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateUserBody } from "@sharq/schemas";
import { teamsKeys } from "../teams/queries";
import { createUser, resetUserPassword, setUserActive } from "./api";
import { usersKeys } from "./queries";

function useInvalidateUserWrites() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: usersKeys.all });
    void queryClient.invalidateQueries({ queryKey: teamsKeys.all });
  };
}

export function useCreateUser() {
  const invalidate = useInvalidateUserWrites();
  return useMutation({
    mutationFn: (body: CreateUserBody) => createUser(body),
    onSettled: invalidate,
  });
}

export function useResetUserPassword() {
  const invalidate = useInvalidateUserWrites();
  return useMutation({
    mutationFn: (id: string) => resetUserPassword(id),
    onSettled: invalidate,
  });
}

export function useSetUserActive() {
  const invalidate = useInvalidateUserWrites();
  return useMutation({
    mutationFn: (input: { id: string; active: boolean; version: number }) =>
      setUserActive(input.id, input.active, input.version),
    onSettled: invalidate,
  });
}
