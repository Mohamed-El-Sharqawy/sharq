// SPEC §10.7 — request logging plumbing (pino JSON in production; the dev
// script pipes through pino-pretty). One info line per request carrying
// request id, user id, method, path, status, duration — nothing else (no
// PII beyond ids). The sink is injected: index.ts passes a real pino
// instance, tests pass fakes, and the default is silent.
import { Elysia } from "elysia";

/** The subset of pino's surface the request logger uses. */
export type RequestLogSink = {
  info(fields: Record<string, unknown>, msg: string): void;
};

/** Per-request store shared with the auth guard (userId) — structural, so
 * both sides stay decoupled (lib/guard.ts fills userId on session). */
export type RequestStore = {
  requestId?: string;
  userId?: string | null;
  startedAt?: number;
};

/** The true response status across elysia 1.4's three return shapes:
 * raw Response (.status), the status() wrapper (.code), plain values
 * (set.status — which may also be an HTTP reason string). */
const responseStatus = (
  response: unknown,
  setStatus: number | string | undefined,
): number => {
  if (response instanceof Response) return response.status;
  const code = (response as { code?: unknown } | null)?.code;
  if (typeof code === "number") return code;
  return typeof setStatus === "number" ? setStatus : 0;
};

type AfterResponseCtx = {
  request: Request;
  response: unknown;
  store: RequestStore;
  set: { status?: number | string };
};

export function createObsRoutes(deps: { logger?: RequestLogSink }) {
  // NOTE: elysia 1.4.30's onRequest has no (options, handler) overload —
  // passing `{ as }` crashes the composer. Plain plugin hooks already
  // cover every route mounted after this plugin (verified by tests).
  return new Elysia({ name: "sharq-obs" })
    .onRequest((ctx: { store: RequestStore }): void => {
      ctx.store.requestId = crypto.randomUUID();
      ctx.store.startedAt = Date.now();
    })
    .onAfterResponse({ as: "global" }, (ctx: AfterResponseCtx): void => {
      if (!deps.logger) return;
      deps.logger.info(
        {
          requestId: ctx.store.requestId ?? null,
          userId: ctx.store.userId ?? null,
          method: ctx.request.method,
          path: new URL(ctx.request.url).pathname,
          status: responseStatus(ctx.response, ctx.set.status),
          durationMs: Date.now() - (ctx.store.startedAt ?? Date.now()),
        },
        "request",
      );
    });
}
