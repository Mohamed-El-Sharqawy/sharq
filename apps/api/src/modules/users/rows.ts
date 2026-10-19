// SPEC §7/§10.1 — shared users-table row plumbing for the repository files:
// the live-user condition, the row type, and the single hash-free mapper.
import { isNull } from "drizzle-orm";
import * as schema from "../../db/schema";
import type { AdminUser } from "./service";

export type UserRow = typeof schema.users.$inferSelect;

/** Soft-deleted users are gone for every admin path (§7 soft delete). */
export const liveUser = isNull(schema.users.deletedAt);

/** The wire-safe user — passwordHash never leaves the repository layer. */
export function toUser(row: UserRow): AdminUser {
  return {
    id: row.id,
    username: row.username,
    phone: row.phone,
    displayNameAr: row.displayNameAr,
    role: row.role,
    isActive: row.isActive,
    mustChangePassword: row.mustChangePassword,
    version: row.version,
  };
}
