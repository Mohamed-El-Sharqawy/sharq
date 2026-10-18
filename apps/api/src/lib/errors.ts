// SPEC §10.4 — the error envelope: every non-happy response is
// `{ error: { code, message, details?, meta? } }` with a stable machine
// code, its fixed HTTP status, and its Arabic message from @sharq/locales
// (the ONLY home for interface strings, SPEC §9).
import { status } from "elysia";
import { API_ERROR_MESSAGES } from "@sharq/locales";
import { type ApiErrorCode, type ErrorEnvelope } from "@sharq/schemas";

// The code SET is owned by @sharq/schemas (§10.3 one source); this Record
// must cover exactly that union — a missing or extra key fails typecheck.
export type { ApiErrorCode, ErrorEnvelope };

// §10.4 verbatim — code → HTTP status. Fixed in code with this citation;
// §5.2 defines no error-code settings.
const ENVELOPE_STATUS = {
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
} as const satisfies Record<ApiErrorCode, number>;

export function apiError(
  code: ApiErrorCode,
  details?: unknown,
  meta?: unknown,
): ErrorEnvelope {
  return {
    error: { code, message: API_ERROR_MESSAGES[code], details, meta },
  };
}

/** A ready-to-return error response (status + envelope) for handlers/guards. */
export function apiErrorStatus(
  code: ApiErrorCode,
  details?: unknown,
  meta?: unknown,
) {
  return status(ENVELOPE_STATUS[code], apiError(code, details, meta));
}
