// SPEC §10.4 — the API-wide error envelope as one TypeBox source (§10.3):
// the 14 stable machine codes and the { error: { code, message, details?,
// meta? } } shape. Arabic messages ride the row-12 error map in
// @sharq/locales; the code set and its fixed statuses are the contract.
import { type Static, Type } from "@sinclair/typebox";

/** §10.4 verbatim — every error response carries one of these codes. */
export const ApiErrorCode = Type.Union([
  Type.Literal("AUTH_REQUIRED"),
  Type.Literal("AUTH_FORBIDDEN"),
  Type.Literal("VALIDATION_FAILED"),
  Type.Literal("NOT_FOUND"),
  Type.Literal("CONFLICT_VERSION"),
  Type.Literal("SETTINGS_CHANGED"),
  Type.Literal("EDIT_WINDOW_CLOSED"),
  Type.Literal("PERIOD_LOCKED"),
  Type.Literal("PERIOD_PAID"),
  Type.Literal("AMOUNT_OUT_OF_BOUNDS"),
  Type.Literal("REASON_REQUIRED"),
  Type.Literal("RATE_LIMITED"),
  Type.Literal("DUPLICATE"),
  Type.Literal("INTERNAL"),
]);
export type ApiErrorCode = Static<typeof ApiErrorCode>;

export const ErrorEnvelope = Type.Object({
  error: Type.Object({
    code: ApiErrorCode,
    message: Type.String(),
    details: Type.Optional(Type.Unknown()),
    meta: Type.Optional(Type.Unknown()),
  }),
});
export type ErrorEnvelope = Static<typeof ErrorEnvelope>;
