// SPEC §10.3/§10.6 — teams + effective-dated memberships (FR-ADM-01..05).
// Dates are `date` columns (§7) carried as ISO labels on the wire; the
// pattern keeps the TypeBox format registry out (rows 1–2 decision).
import { type Static, Type } from "@sinclair/typebox";
import { ListQuery, paginated } from "./pagination";

export const IsoDate = Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" });
export type IsoDate = Static<typeof IsoDate>;

export const CreateTeamBody = Type.Object(
  {
    nameAr: Type.String({ minLength: 1 }),
    supervisorId: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);
export type CreateTeamBody = Static<typeof CreateTeamBody>;

export const UpdateTeamBody = Type.Object(
  {
    nameAr: Type.Optional(Type.String({ minLength: 1 })),
    supervisorId: Type.Optional(
      Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    ),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type UpdateTeamBody = Static<typeof UpdateTeamBody>;

export const TeamResponse = Type.Object(
  {
    id: Type.String(),
    nameAr: Type.String(),
    supervisorId: Type.Union([Type.String(), Type.Null()]),
    isActive: Type.Boolean(),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type TeamResponse = Static<typeof TeamResponse>;

export const TeamsPageBody = paginated(TeamResponse);
export type TeamsPageBody = Static<typeof TeamsPageBody>;

export const AddMemberBody = Type.Object(
  { userId: Type.String({ minLength: 1 }), validFrom: IsoDate },
  { additionalProperties: false },
);
export type AddMemberBody = Static<typeof AddMemberBody>;

/** FR-ADM-04 — ending at E keeps E as the member's LAST day (valid_to is
 * inclusive); `null` reopens an ended membership. */
export const UpdateMemberBody = Type.Object(
  {
    validTo: Type.Optional(Type.Union([IsoDate, Type.Null()])),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type UpdateMemberBody = Static<typeof UpdateMemberBody>;

export const MembershipResponse = Type.Object(
  {
    id: Type.String(),
    teamId: Type.String(),
    userId: Type.String(),
    validFrom: IsoDate,
    validTo: Type.Union([IsoDate, Type.Null()]),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type MembershipResponse = Static<typeof MembershipResponse>;

export const ListTeamsQuery = Type.Object(
  { ...ListQuery.properties },
  { additionalProperties: false },
);
export type ListTeamsQuery = Static<typeof ListTeamsQuery>;
