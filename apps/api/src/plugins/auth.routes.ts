// SPEC §10.1/§10.6 — the auth plugin: login (public), logout / me / password
// (any session). Route defs + TypeBox validation (from @sharq/schemas),
// guard flags, cookie issue/clear per §10.2, service calls, error mapping.
// Business rules live in modules/auth; this file never touches drizzle.
import { Elysia } from "elysia";
import { ChangePasswordBody, LoginBody } from "@sharq/schemas";
import { apiErrorStatus } from "../lib/errors";
import { SESSION_COOKIE, createGuards } from "../lib/guard";
import type { createAuthService } from "../modules/auth/service";

export type AuthRoutesDeps = {
  service: ReturnType<typeof createAuthService>;
  isTeamSupervisor(userId: string, teamId: string): Promise<boolean>;
  /** Prod sets Secure on the session cookie (§10.2). */
  secureCookies: boolean;
};

const cookieOptions = (secure: boolean) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure,
  path: "/",
});

export function createAuthRoutes(deps: AuthRoutesDeps) {
  const guards = createGuards({
    resolveSession: deps.service.resolveSession,
    isTeamSupervisor: deps.isTeamSupervisor,
  });
  return new Elysia({
    name: "auth-routes",
    prefix: "/api/auth",
    tags: ["auth"],
  })
    .use(guards)
    .post(
      "/login",
      async ({ body, cookie }) => {
        const result = await deps.service.login(body, new Date());
        if (result.ok) {
          cookie[SESSION_COOKIE]?.set({
            value: result.token,
            ...cookieOptions(deps.secureCookies),
          });
          return { user: result.user };
        }
        if (result.code === "RATE_LIMITED") {
          return apiErrorStatus("RATE_LIMITED", undefined, {
            retryAfterSeconds: result.retryAfterSeconds,
          });
        }
        // FR-AUTH-01/08: one generic code — no user enumeration.
        return apiErrorStatus("AUTH_REQUIRED");
      },
      { body: LoginBody },
    )
    .get("/me", ({ user }) => ({ user }), { auth: true })
    .post(
      "/logout",
      async ({ cookie, sessionToken }) => {
        await deps.service.logout(sessionToken!, new Date());
        cookie[SESSION_COOKIE]?.set({
          value: "",
          expires: new Date(0),
          maxAge: 0,
          ...cookieOptions(deps.secureCookies),
        });
        return new Response(null, { status: 204 });
      },
      { auth: true },
    )
    .post(
      "/password",
      async ({ body, user }) => {
        const result = await deps.service.changePassword(
          { userId: user.id, current: body.current, next: body.next },
          new Date(),
        );
        if (result.ok) return new Response(null, { status: 204 });
        // §10.4 has no dedicated wrong-current code; the field detail rides
        // VALIDATION_FAILED (Arabic message = row 12's error map).
        return apiErrorStatus("VALIDATION_FAILED", { field: "current" });
      },
      { auth: true, body: ChangePasswordBody },
    );
}
