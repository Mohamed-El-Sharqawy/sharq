// SPEC §7 — pay periods (weekly rows with the locked-period config snapshot)
// + adjustments (signed corrections applied in the next open period).
import {
  bigint,
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
import { periodStateEnum } from "./enums";
import { teams } from "./teams";
import { users } from "./users";

export const payPeriods = pgTable(
  "pay_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    paydayDate: date("payday_date", { mode: "string" }).notNull(),
    state: periodStateEnum("state").notNull().default("open"),
    configSnapshot: jsonb("config_snapshot"),
    lockedBy: uuid("locked_by").references(() => users.id),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    paidBy: uuid("paid_by").references(() => users.id),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("pay_periods_team_start_unq").on(t.teamId, t.startDate),
    check(
      "pay_periods_end_after_start_chk",
      sql`${t.endDate} > ${t.startDate}`,
    ),
    index("pay_periods_state_idx").on(t.state),
  ],
);

export const adjustments = pgTable(
  "adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    fromPeriodId: uuid("from_period_id")
      .notNull()
      .references(() => payPeriods.id),
    appliedPeriodId: uuid("applied_period_id")
      .notNull()
      .references(() => payPeriods.id),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("adjustments_applied_period_id_idx").on(t.appliedPeriodId),
    index("adjustments_user_id_idx").on(t.userId),
  ],
);
