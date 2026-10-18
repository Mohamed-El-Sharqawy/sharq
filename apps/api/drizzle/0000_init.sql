CREATE TYPE "public"."entry_source" AS ENUM('web', 'offline_sync');--> statement-breakpoint
CREATE TYPE "public"."period_state" AS ENUM('open', 'locked', 'paid');--> statement-breakpoint
CREATE TYPE "public"."rate_scope_type" AS ENUM('company', 'team', 'employee');--> statement-breakpoint
CREATE TYPE "public"."reason_kind" AS ENUM('override', 'deduction');--> statement-breakpoint
CREATE TYPE "public"."setting_scope_type" AS ENUM('company', 'team');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('employee', 'supervisor', 'admin');--> statement-breakpoint
CREATE TABLE "attendance_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"status_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"base_rate_snapshot_minor" bigint NOT NULL,
	"is_override" boolean DEFAULT false NOT NULL,
	"reason_catalog_id" uuid,
	"reason_text" text,
	"source" "entry_source" DEFAULT 'web' NOT NULL,
	"created_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"period_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"reason_catalog_id" uuid,
	"reason_text" text NOT NULL,
	"created_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "deductions_amount_positive_chk" CHECK ("deductions"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"note" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text
);
--> statement-breakpoint
CREATE TABLE "attendance_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"carries_pay" boolean NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_statuses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"name_ar" text NOT NULL,
	"created_by" uuid,
	CONSTRAINT "holidays_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "pay_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" "rate_scope_type" NOT NULL,
	"scope_key" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"note" text,
	"created_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pay_rates_amount_positive_chk" CHECK ("pay_rates"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "reason_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "reason_kind" NOT NULL,
	"name_ar" text NOT NULL,
	"default_amount_minor" bigint,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"scope_type" "setting_scope_type" NOT NULL,
	"team_id" uuid,
	"value" jsonb NOT NULL,
	"valid_from" date NOT NULL,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_scope_team_from_unq" UNIQUE NULLS NOT DISTINCT("key","scope_type","team_id","valid_from")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip" text,
	"user_agent" text,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"phone" text,
	"display_name_ar" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_ar" text NOT NULL,
	"supervisor_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_period_id" uuid NOT NULL,
	"applied_period_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pay_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"payday_date" date NOT NULL,
	"state" "period_state" DEFAULT 'open' NOT NULL,
	"config_snapshot" jsonb,
	"locked_by" uuid,
	"locked_at" timestamp with time zone,
	"paid_by" uuid,
	"paid_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pay_periods_team_start_unq" UNIQUE("team_id","start_date"),
	CONSTRAINT "pay_periods_end_after_start_chk" CHECK ("pay_periods"."end_date" > "pay_periods"."start_date")
);
--> statement-breakpoint
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_status_id_attendance_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."attendance_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_reason_catalog_id_reason_catalog_id_fk" FOREIGN KEY ("reason_catalog_id") REFERENCES "public"."reason_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_period_id_pay_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."pay_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_reason_catalog_id_reason_catalog_id_fk" FOREIGN KEY ("reason_catalog_id") REFERENCES "public"."reason_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_rates" ADD CONSTRAINT "pay_rates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_from_period_id_pay_periods_id_fk" FOREIGN KEY ("from_period_id") REFERENCES "public"."pay_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_applied_period_id_pay_periods_id_fk" FOREIGN KEY ("applied_period_id") REFERENCES "public"."pay_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_periods" ADD CONSTRAINT "pay_periods_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_periods" ADD CONSTRAINT "pay_periods_locked_by_users_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_periods" ADD CONSTRAINT "pay_periods_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_entries_user_date_unq" ON "attendance_entries" USING btree ("user_id","entry_date") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "attendance_entries_team_date_idx" ON "attendance_entries" USING btree ("team_id","entry_date");--> statement-breakpoint
CREATE INDEX "attendance_entries_user_date_idx" ON "attendance_entries" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE INDEX "deductions_period_id_idx" ON "deductions" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "deductions_user_date_idx" ON "deductions" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "pay_rates_scope_key_valid_from_idx" ON "pay_rates" USING btree ("scope_key","valid_from");--> statement-breakpoint
CREATE INDEX "reason_catalog_kind_is_active_idx" ON "reason_catalog" USING btree ("kind","is_active");--> statement-breakpoint
CREATE INDEX "settings_key_idx" ON "settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "team_memberships_user_id_idx" ON "team_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_memberships_team_id_idx" ON "team_memberships" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "teams_supervisor_id_idx" ON "teams" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX "adjustments_applied_period_id_idx" ON "adjustments" USING btree ("applied_period_id");--> statement-breakpoint
CREATE INDEX "adjustments_user_id_idx" ON "adjustments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pay_periods_state_idx" ON "pay_periods" USING btree ("state");--> statement-breakpoint
-- ─── Hand-maintained from here down (drizzle-kit cannot express these) ───────
-- drizzle-kit regenerates only what the schema declares; its snapshot differ
-- never touches statements it did not generate, so this block is stable.
-- New tables (Phase 2+) must extend the GRANT list for sharq_app.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_no_overlap_excl" EXCLUDE USING gist ("user_id" WITH =, daterange("valid_from", coalesce("valid_to", 'infinity'::date)) WITH &&);--> statement-breakpoint
ALTER TABLE "pay_rates" ADD CONSTRAINT "pay_rates_scope_no_overlap_excl" EXCLUDE USING gist ("scope_key" WITH =, daterange("valid_from", coalesce("valid_to", 'infinity'::date)) WITH &&);--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sharq_app') THEN
    CREATE ROLE sharq_app NOLOGIN;
  END IF;
END
$$;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sharq_app;--> statement-breakpoint
REVOKE UPDATE, DELETE ON audit_log FROM sharq_app;