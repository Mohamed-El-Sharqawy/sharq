// Postgres enum types for SPEC §7. Names are the DB contract — migrations,
// seeds and repos all rely on them; extend only additively.
import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "employee",
  "supervisor",
  "admin",
]);
export const rateScopeEnum = pgEnum("rate_scope_type", [
  "company",
  "team",
  "employee",
]);
export const settingScopeEnum = pgEnum("setting_scope_type", [
  "company",
  "team",
]);
export const reasonKindEnum = pgEnum("reason_kind", ["override", "deduction"]);
export const entrySourceEnum = pgEnum("entry_source", ["web", "offline_sync"]);
export const periodStateEnum = pgEnum("period_state", [
  "open",
  "locked",
  "paid",
]);
