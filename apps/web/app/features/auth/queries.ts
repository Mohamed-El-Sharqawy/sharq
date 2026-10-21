// apps/web — session queries (SPEC §9.6): the `_app` layout probes
// /api/auth/me to know the role (admin nav) and to redirect on 401.
// Kept separate from login.logic.ts so list screens compose this without
// the login flow.
import { queryOptions, useQuery } from "@tanstack/react-query";
import { meRequest } from "./api";

export const sessionKeys = {
  all: ["session"] as const,
  me: () => [...sessionKeys.all, "me"] as const,
};

export function sessionOptions() {
  return queryOptions({
    queryKey: sessionKeys.me(),
    queryFn: meRequest,
  });
}

export function useSession() {
  return useQuery(sessionOptions());
}

/** Admin-screen role gate (SPEC §11: /users + /teams are admin). Never
 * blocks on transport failure — "unresolved" renders the screen and the
 * server's 403 envelope is the real guard; "denied" means the session
 * loaded and the role is wrong. */
export function useAdminRole() {
  const session = useSession();
  if (session.data?.user.role === "admin") return "allowed" as const;
  if (session.data) return "denied" as const;
  return "unresolved" as const;
}
