// SPEC §10.1/§10.6 — the auth plugin: login (public, per-IP rate-limited
// per §10.7), logout / me / password (any session). Route defs + TypeBox
// validation (from @sharq/schemas), guard flags, cookie issue/clear per
// §10.2, service calls, error mapping. Business rules live in
// modules/auth; this file never touches drizzle.
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { ChangePasswordBody, LoginBody } from "@sharq/schemas";
import { apiError, apiErrorStatus } from "../lib/errors";
import type { RequestStore } from "../lib/obs";
import { SESSION_COOKIE, createGuards } from "../lib/guard";
import type { createAuthService } from "../modules/auth/service";

export type AuthRoutesDeps = {
  service: ReturnType<typeof createAuthService>;
  isTeamSupervisor(userId: string, teamId: string): Promise<boolean>;
  /** Prod sets Secure on the session cookie (§10.2). */
  secureCookies: boolean;
  /** §10.6 login row: 10/min/IP (§10.7 default; env-tunable at the boot). */
  authRateLimitMax: number;
};

const cookieOptions = (secure: boolean) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure,
  path: "/",
});

/** Client IP for the login bucket: Traefik's X-Forwarded-For first hop,
 * then the socket address, then a shared "unknown" (app.handle-driven
 * tests have no socket — every such app instance still owns its bucket). */
const clientKey = (
  request: Request,
  server: { requestIP(request: Request): { address: string } | null } | null,
): string =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  server?.requestIP(request)?.address ||
  "unknown";

/** POST /api/auth/login inside its own per-IP limiter (§10.7): the 429 is
 * the §10.4 envelope like every other error — same code, same Arabic
 * message, no plugin-specific body. */
const createLoginRoute = (deps: AuthRoutesDeps) => {
  const handler = async ({
    body,
    cookie,
    store,
  }: {
    body: { identifier: string; password: string };
    cookie: Record<string, { set(opts: Record<string, unknown>): void }>;
    store: RequestStore;
  }) => {
    const result = await deps.service.login(body, new Date());
    if (result.ok) {
      store.userId = result.user.id;
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
  };

  // No prefix here: this instance is mounted inside the /api/auth plugin
  // (prefixes compound in Elysia — a nested /api/auth would double it).
  return new Elysia({ name: "auth-login", tags: ["auth"] })
    .use(
      rateLimit({
        max: deps.authRateLimitMax,
        duration: 60_000,
        scoping: "scoped",
        generator: clientKey,
        errorResponse: new Response(JSON.stringify(apiError("RATE_LIMITED")), {
          status: 429,
          headers: { "content-type": "application/json" },
        }),
      }),
    )
    .post("/login", handler, { body: LoginBody });
};

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
    .use(createLoginRoute(deps))
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
        // §10.4 has no dedicated wrong-current code; the field detail
        // rides VALIDATION_FAILED with its Arabic message.
        return apiErrorStatus("VALIDATION_FAILED", { field: "current" });
      },
      { auth: true, body: ChangePasswordBody },
    );
}
