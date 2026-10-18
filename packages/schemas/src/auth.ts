// SPEC §10.3/§10.6 — auth request/response schemas. One TypeBox source feeds
// Elysia validation and (via Eden) the web client's typed calls.
import { type Static, Type } from "@sinclair/typebox";

export const LoginBody = Type.Object({
  identifier: Type.String({ minLength: 1, description: "username or phone" }),
  password: Type.String({ minLength: 1 }),
});
export type LoginBody = Static<typeof LoginBody>;

export const ChangePasswordBody = Type.Object({
  current: Type.String({ minLength: 1 }),
  next: Type.String({ minLength: 1 }),
});
export type ChangePasswordBody = Static<typeof ChangePasswordBody>;

export const AuthUserRole = Type.Union([
  Type.Literal("employee"),
  Type.Literal("supervisor"),
  Type.Literal("admin"),
]);

/** The public user shape every auth route returns (never the hash). */
export const AuthUserResponse = Type.Object({
  id: Type.String(),
  username: Type.String(),
  phone: Type.Union([Type.String(), Type.Null()]),
  displayNameAr: Type.String(),
  role: AuthUserRole,
  mustChangePassword: Type.Boolean(),
});
export type AuthUserResponse = Static<typeof AuthUserResponse>;
