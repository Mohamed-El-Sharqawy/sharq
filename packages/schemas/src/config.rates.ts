// SPEC §10.3/§10.6 — pay_rates wire schemas (FR-SET-03, EC-42/55/56).
// Money is integer minor units > 0 on the wire (EC-31: the server never
// accepts decimals — the @sharq/schemas money normalizer is the INPUT
// boundary's tool, applied client-side before the call).
import { type Static, Type } from "@sinclair/typebox";
import { IsoDate } from "./teams";

export const RateScopeSchema = Type.Union([
  Type.Literal("company"),
  Type.Literal("team"),
  Type.Literal("employee"),
]);
export type RateScope = Static<typeof RateScopeSchema>;

/** POST /api/rates — §10.6 RateInput. scopeKey is the team/user id and is
 * required unless scopeType is "company" (the server normalizes company
 * rows to the fixed seed-convention key; see @sharq/payroll config). */
export const CreateRateBody = Type.Object(
  {
    scopeType: RateScopeSchema,
    scopeKey: Type.Optional(Type.String({ minLength: 1 })),
    amountMinor: Type.Integer({ minimum: 1 }),
    validFrom: IsoDate,
    note: Type.Optional(Type.String({ maxLength: 200 })),
  },
  { additionalProperties: false },
);
export type CreateRateBody = Static<typeof CreateRateBody>;

/** PATCH /api/rates/:id — §10.6 verbatim: `{validTo?, amountMinor?
 * (future rows only), version}`. `validTo: null` reopens a closed row. */
export const UpdateRateBody = Type.Object(
  {
    validTo: Type.Optional(Type.Union([IsoDate, Type.Null()])),
    amountMinor: Type.Optional(Type.Integer({ minimum: 1 })),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type UpdateRateBody = Static<typeof UpdateRateBody>;

export const RateResponse = Type.Object(
  {
    id: Type.String(),
    scopeType: RateScopeSchema,
    scopeKey: Type.String(),
    amountMinor: Type.Integer({ minimum: 1 }),
    validFrom: IsoDate,
    validTo: Type.Union([IsoDate, Type.Null()]),
    note: Type.Union([Type.String(), Type.Null()]),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type RateResponse = Static<typeof RateResponse>;

/** GET /api/rates — the full timeline list (§10.6 "rates list"; no
 * pagination is defined for this route — the rates screen renders whole
 * timelines per scope). */
export const RatesResponseBody = Type.Object(
  { rates: Type.Array(RateResponse) },
  { additionalProperties: false },
);
export type RatesResponseBody = Static<typeof RatesResponseBody>;
