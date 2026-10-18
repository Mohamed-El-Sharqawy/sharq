// Contract-test plumbing (TESTING §7/§8), shared by the auth contract suites
// and the upcoming role-matrix harness: every response is validated against
// its TypeBox schema from @sharq/schemas, and every error response against
// the §10.4 envelope — status and code must match the SPEC-verbatim pair
// table below, so drift on either side fails loudly. Helpers throw plain
// errors with precise messages; value assertions stay in the specs.
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { type ApiErrorCode, ErrorEnvelope } from "@sharq/schemas";
import { createApp, type App } from "../../src/app";
import { createDrizzleAudit } from "../../src/lib/audit";
import { createDrizzleAuthRepo } from "../../src/modules/auth/repository";
import type { TestDb } from "./helpers";

// SPEC §10.4 verbatim — stable code → fixed HTTP status.
export const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  AUTH_REQUIRED: 401,
  AUTH_FORBIDDEN: 403,
  VALIDATION_FAILED: 422,
  NOT_FOUND: 404,
  CONFLICT_VERSION: 409,
  SETTINGS_CHANGED: 409,
  EDIT_WINDOW_CLOSED: 409,
  PERIOD_LOCKED: 409,
  PERIOD_PAID: 409,
  AMOUNT_OUT_OF_BOUNDS: 422,
  REASON_REQUIRED: 422,
  RATE_LIMITED: 429,
  DUPLICATE: 409,
  INTERNAL: 500,
};

/** The §10.1 composition over a real container: real drizzle repo, the real
 * src-side audit writer, repo-borne teamScope check — the production wiring
 * (src/index.ts) against an ephemeral Postgres instead of the dev DB. */
export function createIntegrationApp(
  t: TestDb,
  opts: { secureCookies?: boolean } = {},
): App {
  const repo = createDrizzleAuthRepo(t.db);
  return createApp({
    repo,
    audit: createDrizzleAudit(t.db),
    isTeamSupervisor: repo.isTeamSupervisor,
    secureCookies: opts.secureCookies,
  });
}

export type CallOpts = { method?: string; body?: unknown; cookie?: string };

/** Drives the composed app over http://localhost (a single-letter URL host
 * 404s every route — see the PROGRESS environment notes). A string body is
 * sent raw so PARSE-level contract cases can post malformed JSON. */
export function apiCall(
  app: App,
  path: string,
  opts: CallOpts = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.cookie) headers.cookie = `sharq_session=${opts.cookie}`;
  const raw =
    typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  return app.handle(
    new Request(`http://localhost${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : raw,
    }),
  );
}

/** Session-cookie value out of a Set-Cookie header (each response carries
 * exactly one). */
export function cookieValueFrom(res: Response): string {
  return res.headers.get("set-cookie")!.split(";")[0]!.split("=")[1]!;
}

/** Validates a decoded value against a TypeBox schema; throws with the
 * TypeBox error paths (TESTING §8.2 — the published schema IS the
 * contract). */
export function assertSchema(schema: TSchema, value: unknown): void {
  if (Value.Check(schema, value)) return;
  const detail = [...Value.Errors(schema, value)]
    .map((e) => `${e.path || "/"} ${e.message}`)
    .join("; ");
  throw new Error(`response violates its schema: ${detail}`);
}

export type Envelope = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    meta?: unknown;
  };
};

/** Parses an error response and asserts its full §10.4 contract: the fixed
 * status for the code, a JSON content-type, the envelope shape, and the
 * exact machine code. Returns the parsed envelope. Message strings are
 * deliberately not compared (TEMP error-map: row 12 swaps in Arabic). */
export async function expectEnvelope(
  res: Response,
  code: ApiErrorCode,
): Promise<Envelope> {
  const expected = STATUS_BY_CODE[code];
  if (res.status !== expected)
    throw new Error(
      `${code} contract: expected HTTP ${expected}, got ${res.status}`,
    );
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("application/json"))
    throw new Error(
      `${code} contract: expected application/json, got "${type}"`,
    );
  const body = (await res.json()) as Envelope;
  assertSchema(ErrorEnvelope, body);
  if (body.error.code !== code)
    throw new Error(`envelope code: expected ${code}, got ${body.error.code}`);
  return body;
}
