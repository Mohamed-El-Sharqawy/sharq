// SPEC §7 — attendance entries + deductions. One LIVE entry per employee per
// day: the unique index is partial (WHERE deleted_at IS NULL) so a soft-deleted
// entry never blocks re-recording the day, while history stays readable.
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { payPeriods } from "./payroll";
import { attendanceStatuses, reasonCatalog } from "./config";
import { teams } from "./teams";
import { users } from "./users";
import { entrySourceEnum } from "./enums";

export const attendanceEntries = pgTable(
  "attendance_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    statusId: uuid("status_id")
      .notNull()
      .references(() => attendanceStatuses.id),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    baseRateSnapshotMinor: bigint("base_rate_snapshot_minor", {
      mode: "number",
    }).notNull(),
    isOverride: boolean("is_override").notNull().default(false),
    reasonCatalogId: uuid("reason_catalog_id").references(
      () => reasonCatalog.id,
    ),
    reasonText: text("reason_text"),
    source: entrySourceEnum("source").notNull().default("web"),
    createdBy: uuid("created_by").references(() => users.id),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("attendance_entries_user_date_unq")
      .on(t.userId, t.entryDate)
      .where(sql`deleted_at is null`),
    index("attendance_entries_team_date_idx").on(t.teamId, t.entryDate),
    index("attendance_entries_user_date_idx").on(t.userId, t.entryDate),
  ],
);

export const deductions = pgTable(
  "deductions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => payPeriods.id),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    reasonCatalogId: uuid("reason_catalog_id").references(
      () => reasonCatalog.id,
    ),
    reasonText: text("reason_text").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("deductions_period_id_idx").on(t.periodId),
    index("deductions_user_date_idx").on(t.userId, t.entryDate),
    check("deductions_amount_positive_chk", sql`${t.amountMinor} > 0`),
  ],
);
