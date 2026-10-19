// SPEC §7 — teams + effective-dated team memberships. The "one team per
// employee per day" guarantee is an EXCLUDE constraint (btree_gist) appended
// to the initial migration: drizzle-kit cannot express exclusion constraints,
// so they live in hand-maintained SQL at the end of that file.
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nameAr: text("name_ar").notNull(),
    supervisorId: uuid("supervisor_id").references(() => users.id),
    isActive: boolean("is_active").notNull().default(true),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("teams_supervisor_id_idx").on(t.supervisorId)],
);

export const teamMemberships = pgTable(
  "team_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    validFrom: date("valid_from", { mode: "string" }).notNull(),
    validTo: date("valid_to", { mode: "string" }),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("team_memberships_user_id_idx").on(t.userId),
    index("team_memberships_team_id_idx").on(t.teamId),
  ],
);
