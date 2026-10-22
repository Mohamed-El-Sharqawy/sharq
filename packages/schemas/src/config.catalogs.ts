// SPEC §10.3/§10.6 — catalog wire schemas: reason_catalog (FR-SET-04,
// EC-46), attendance_statuses (FR-SET-05, system rows protected) and
// holidays (FR-SET-06). Catalogs deactivate via PATCH — never delete
// (§5.5.4); only holidays have a DELETE route (§10.6 verbatim).
import { type Static, Type } from "@sinclair/typebox";
import { IsoDate } from "./teams";

export const ReasonKindSchema = Type.Union([
  Type.Literal("override"),
  Type.Literal("deduction"),
]);
export type ReasonKind = Static<typeof ReasonKindSchema>;

export const CreateReasonBody = Type.Object(
  {
    kind: ReasonKindSchema,
    nameAr: Type.String({ minLength: 1, maxLength: 100 }),
    defaultAmountMinor: Type.Optional(Type.Integer({ minimum: 0 })),
  },
  { additionalProperties: false },
);
export type CreateReasonBody = Static<typeof CreateReasonBody>;

export const UpdateReasonBody = Type.Object(
  {
    nameAr: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    defaultAmountMinor: Type.Optional(
      Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    ),
    isActive: Type.Optional(Type.Boolean()),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type UpdateReasonBody = Static<typeof UpdateReasonBody>;

export const ReasonResponse = Type.Object(
  {
    id: Type.String(),
    kind: ReasonKindSchema,
    nameAr: Type.String(),
    defaultAmountMinor: Type.Union([Type.Integer(), Type.Null()]),
    isActive: Type.Boolean(),
    sortOrder: Type.Integer(),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type ReasonResponse = Static<typeof ReasonResponse>;

export const ReasonsResponseBody = Type.Object(
  { reasons: Type.Array(ReasonResponse) },
  { additionalProperties: false },
);
export type ReasonsResponseBody = Static<typeof ReasonsResponseBody>;

export const CreateStatusBody = Type.Object(
  {
    code: Type.String({ minLength: 1, maxLength: 32 }),
    nameAr: Type.String({ minLength: 1, maxLength: 100 }),
    carriesPay: Type.Boolean(),
  },
  { additionalProperties: false },
);
export type CreateStatusBody = Static<typeof CreateStatusBody>;

export const UpdateStatusBody = Type.Object(
  {
    nameAr: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    carriesPay: Type.Optional(Type.Boolean()),
    isActive: Type.Optional(Type.Boolean()),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type UpdateStatusBody = Static<typeof UpdateStatusBody>;

export const StatusResponse = Type.Object(
  {
    id: Type.String(),
    code: Type.String(),
    nameAr: Type.String(),
    carriesPay: Type.Boolean(),
    isSystem: Type.Boolean(),
    isActive: Type.Boolean(),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type StatusResponse = Static<typeof StatusResponse>;

export const StatusesResponseBody = Type.Object(
  { statuses: Type.Array(StatusResponse) },
  { additionalProperties: false },
);
export type StatusesResponseBody = Static<typeof StatusesResponseBody>;

export const CreateHolidayBody = Type.Object(
  {
    date: IsoDate,
    nameAr: Type.String({ minLength: 1, maxLength: 100 }),
  },
  { additionalProperties: false },
);
export type CreateHolidayBody = Static<typeof CreateHolidayBody>;

/** Holidays carry no version (§7: the table has none — add/remove only). */
export const HolidayResponse = Type.Object(
  {
    id: Type.String(),
    date: IsoDate,
    nameAr: Type.String(),
  },
  { additionalProperties: false },
);
export type HolidayResponse = Static<typeof HolidayResponse>;

export const HolidaysResponseBody = Type.Object(
  { holidays: Type.Array(HolidayResponse) },
  { additionalProperties: false },
);
export type HolidaysResponseBody = Static<typeof HolidaysResponseBody>;
