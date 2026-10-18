// SPEC §10.2 — guard macros: `auth` (session → user on the context, 401
// otherwise), `role(...)` (403 on role mismatch, 401 when anonymous) and
// `teamScope(...)` (admin bypasses; supervisors pass only for their own
// live team). Applied per route; services re-check ownership (defense in
// depth) and repositories take explicit scopes.
import { Elysia } from "elysia";
import type { AuthRole, AuthSession, AuthUser } from "../modules/auth/types";
import { apiErrorStatus } from "./errors";

/** §10.2 verbatim: the session cookie name. */
export const SESSION_COOKIE = "sharq_session";

export type GuardDeps = {
  resolveSession(
    token: string,
    now: Date,
  ): Promise<{ user: AuthUser; session: AuthSession } | null>;
  isTeamSupervisor(userId: string, teamId: string): Promise<boolean>;
};

type Jar = { [key: string]: { value?: unknown } | undefined };
type Sessioned = { user?: AuthUser; sessionToken?: string };
type RequestParts = {
  params?: Record<string, string>;
  query?: Record<string, string | undefined>;
  body?: unknown;
};
/** What the auth macro adds to the context when a session is live. */
type GuardContext = { user: AuthUser; sessionToken: string };

export function createGuards(deps: GuardDeps) {
  return new Elysia({ name: "sharq-guards" }).macro({
    auth: {
      // Runtime: no/invalid session short-circuits with 401 AUTH_REQUIRED.
      // Declared as the success shape so `user`/`sessionToken` flow into the
      // route handlers' types (the status branch is Elysia's short-circuit,
      // not a route response — envelope errors are contract-validated
      // test-side via the closed @sharq/schemas schemas; per-route Elysia
      // response schemas land when Eden is first consumed, Phase 2+).
      resolve: async ({ cookie }: { cookie: Jar }): Promise<GuardContext> => {
        const raw = cookie[SESSION_COOKIE]?.value;
        const token = typeof raw === "string" ? raw : undefined;
        if (!token) {
          return apiErrorStatus("AUTH_REQUIRED") as unknown as GuardContext;
        }
        const found = await deps.resolveSession(token, new Date());
        if (!found) {
          return apiErrorStatus("AUTH_REQUIRED") as unknown as GuardContext;
        }
        return { user: found.user, sessionToken: token };
      },
    },
    // `user` arrives from the auth macro's resolve (declared before this one).
    role: (required: AuthRole) => ({
      resolve: async ({ user }: Sessioned & RequestParts) => {
        if (!user) return apiErrorStatus("AUTH_REQUIRED");
        if (user.role !== required) return apiErrorStatus("AUTH_FORBIDDEN");
      },
    }),
    teamScope: (key: string) => ({
      resolve: async ({
        user,
        params,
        query,
        body,
      }: Sessioned & RequestParts) => {
        if (!user) return apiErrorStatus("AUTH_REQUIRED");
        if (user.role === "admin") return;
        const teamId = pickTeamId(params, query, body, key);
        if (!teamId || !(await deps.isTeamSupervisor(user.id, teamId))) {
          return apiErrorStatus("AUTH_FORBIDDEN");
        }
      },
    }),
  });
}

function pickTeamId(
  params: RequestParts["params"],
  query: RequestParts["query"],
  body: RequestParts["body"],
  key: string,
): string | undefined {
  const from = (source: unknown): string | undefined =>
    typeof source === "object" && source !== null
      ? ((source as Record<string, unknown>)[key] as string | undefined)
      : undefined;
  return from(params) ?? from(query) ?? from(body);
}
