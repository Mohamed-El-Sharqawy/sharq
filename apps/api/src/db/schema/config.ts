// SPEC §7 — the dynamic-configuration tables: effective-dated pay_rates,
// settings rows, and the three catalogs (reasons, attendance statuses,
// holidays). Rate overlap prevention per scope target is an EXCLUDE
// constraint appended to the initial migration (see teams.ts note).
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { teams } from "./teams";
import { users } from "./users";
import { rateScopeEnum, reasonKindEnum, settingScopeEnum } from "./enums";

export const payRates = pgTable(
  "pay_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeType: rateScopeEnum("scope_type").notNull(),
    scopeKey: text("scope_key").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    validFrom: date("valid_from", { mode: "string" }).notNull(),
    validTo: date("valid_to", { mode: "string" }),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pay_rates_scope_key_valid_from_idx").on(t.scopeKey, t.validFrom),
    check("pay_rates_amount_positive_chk", sql`${t.amountMinor} > 0`),
  ],
);

export const settings = pgTable(
  "settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    scopeType: settingScopeEnum("scope_type").notNull(),
    teamId: uuid("team_id").references(() => teams.id),
    value: jsonb("value").notNull(),
    validFrom: date("valid_from", { mode: "string" }).notNull(),
    updatedBy: uuid("updated_by").references(() => users.id),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // NULLS NOT DISTINCT: without it, two company rows (team_id NULL) for the
    // same key+date would both be "distinct" and slip past the constraint.
    unique("settings_key_scope_team_from_unq")
      .on(t.key, t.scopeType, t.teamId, t.validFrom)
      .nullsNotDistinct(),
    index("settings_key_idx").on(t.key),
  ],
);

export const reasonCatalog = pgTable(
  "reason_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: reasonKindEnum("kind").notNull(),
    nameAr: text("name_ar").notNull(),
    defaultAmountMinor: bigint("default_amount_minor", { mode: "number" }),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("reason_catalog_kind_is_active_idx").on(t.kind, t.isActive)],
);

export const attendanceStatuses = pgTable("attendance_statuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  carriesPay: boolean("carries_pay").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const holidays = pgTable("holidays", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date", { mode: "string" }).notNull().unique(),
  nameAr: text("name_ar").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
});
