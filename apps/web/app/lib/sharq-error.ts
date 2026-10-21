// apps/web — the §10.4 envelope → SharqError normalization (SPEC §9.6:
// error normalization maps the API envelope to a typed client error).
// Pure parsing only — the fetch itself stays inside feature api.ts files
// (§9.1's one sanctioned fetch context; the eslint override globs exactly
// those files, and this module is imported BY them).
import { API_ERROR_MESSAGES, SERVER_UNAVAILABLE } from "@sharq/locales";
import type { ApiErrorCode } from "@sharq/schemas";

/** The typed client error every feature api.ts throws. `message` is the
 * Arabic sentence for the user (the server envelope's, or the local map's
 * fallback — same wording either side, one home: @sharq/locales). */
export class SharqError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: unknown;
  readonly meta: unknown;

  constructor(options: {
    code: ApiErrorCode;
    status: number;
    message: string;
    details?: unknown;
    meta?: unknown;
  }) {
    super(options.message);
    this.name = "SharqError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.meta = options.meta;
  }
}

export function isSharqError(error: unknown): error is SharqError {
  return error instanceof SharqError;
}

type EnvelopeBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    meta?: unknown;
  };
};

/** Parse a non-2xx response's §10.4 envelope; anything malformed degrades
 * to INTERNAL with the Arabic fallback (never leaks raw transport text). */
export async function sharqErrorFromResponse(
  response: Response,
): Promise<SharqError> {
  const body = (await response.json().catch(() => null)) as EnvelopeBody | null;
  const code = body?.error?.code;
  if (code && code in API_ERROR_MESSAGES) {
    const known = code as ApiErrorCode;
    return new SharqError({
      code: known,
      status: response.status,
      message: body.error?.message ?? API_ERROR_MESSAGES[known],
      details: body.error?.details,
      meta: body.error?.meta,
    });
  }
  return new SharqError({
    code: "INTERNAL",
    status: response.status,
    message: API_ERROR_MESSAGES.INTERNAL,
  });
}

/** The transport-level failure (fetch threw / unreachable) — same Arabic
 * sentence login coined, under a screen-neutral name. */
export function transportError(): SharqError {
  return new SharqError({
    code: "INTERNAL",
    status: 0,
    message: SERVER_UNAVAILABLE,
  });
}

/** The user-facing Arabic message for any thrown error. */
export function errorMessage(error: unknown): string {
  return isSharqError(error) ? error.message : SERVER_UNAVAILABLE;
}
