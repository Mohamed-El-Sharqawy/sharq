// SPEC §10.3/§10.6 — admin user-management schemas (FR-AUTH-04..06,
// FR-ADM-06). One TypeBox source feeds Elysia validation and the Eden
// client. Username is immutable after creation (identifier stability);
// active-state changes go through /deactivate | /reactivate, never PATCH.
import { type Static, Type } from "@sinclair/typebox";
import { AuthUserRole } from "./auth";
import { ListQuery, paginated } from "./pagination";

export const CreateUserBody = Type.Object(
  {
    username: Type.String({ minLength: 1 }),
    phone: Type.Optional(Type.String({ minLength: 1 })),
    displayNameAr: Type.String({ minLength: 1 }),
    role: AuthUserRole,
  },
  { additionalProperties: false },
);
export type CreateUserBody = Static<typeof CreateUserBody>;

export const UpdateUserBody = Type.Object(
  {
    displayNameAr: Type.Optional(Type.String({ minLength: 1 })),
    phone: Type.Optional(
      Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    ),
    role: Type.Optional(AuthUserRole),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type UpdateUserBody = Static<typeof UpdateUserBody>;

/** /deactivate and /reactivate carry only the concurrency version. */
export const UserVersionBody = Type.Object(
  { version: Type.Integer({ minimum: 1 }) },
  { additionalProperties: false },
);
export type UserVersionBody = Static<typeof UserVersionBody>;

/** The admin-side user shape — adds the version the client must echo back
 * (§10.4 optimistic concurrency). Closed: an internal-field leak fails
 * validation (standing rule from the auth response schemas). */
export const UserResponse = Type.Object(
  {
    id: Type.String(),
    username: Type.String(),
    phone: Type.Union([Type.String(), Type.Null()]),
    displayNameAr: Type.String(),
    role: AuthUserRole,
    isActive: Type.Boolean(),
    mustChangePassword: Type.Boolean(),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
export type UserResponse = Static<typeof UserResponse>;

/** FR-AUTH-04 — creation returns the minted temp password for the admin to
 * share out-of-band (FR-AUTH-05). */
export const CreatedUserBody = Type.Object(
  { user: UserResponse, tempPassword: Type.String() },
  { additionalProperties: false },
);
export type CreatedUserBody = Static<typeof CreatedUserBody>;

export const TempPasswordBody = Type.Object(
  { tempPassword: Type.String() },
  { additionalProperties: false },
);
export type TempPasswordBody = Static<typeof TempPasswordBody>;

/** §10.6 GET /api/users — `page, q, role, teamId` (FR-ADM-06). */
export const ListUsersQuery = Type.Object(
  {
    ...ListQuery.properties,
    q: Type.Optional(Type.String()),
    role: Type.Optional(AuthUserRole),
    teamId: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
export type ListUsersQuery = Static<typeof ListUsersQuery>;

export const UsersPageBody = paginated(UserResponse);
export type UsersPageBody = Static<typeof UsersPageBody>;
