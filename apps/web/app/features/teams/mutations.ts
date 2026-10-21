// apps/web — teams feature mutations (SPEC §9.6 invalidation map: team
// mutations → ['teams'] + ['users'] + ['memberships'] — memberships have
// no key of their own yet; member lists ride ['users'] with a teamId
// param, so both roots invalidate on membership writes).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AddMemberBody, CreateTeamBody } from "@sharq/schemas";
import { usersKeys } from "../users/queries";
import { addTeamMember, createTeam } from "./api";
import { teamsKeys } from "./queries";

function useInvalidateTeamWrites() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: teamsKeys.all });
    void queryClient.invalidateQueries({ queryKey: usersKeys.all });
  };
}

export function useCreateTeam() {
  const invalidate = useInvalidateTeamWrites();
  return useMutation({
    mutationFn: (body: CreateTeamBody) => createTeam(body),
    onSettled: invalidate,
  });
}

export function useAddTeamMember(teamId: string) {
  const invalidate = useInvalidateTeamWrites();
  return useMutation({
    mutationFn: (body: AddMemberBody) => addTeamMember(teamId, body),
    onSettled: invalidate,
  });
}
