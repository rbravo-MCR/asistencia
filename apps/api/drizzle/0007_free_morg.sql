CREATE TABLE "attendance_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"recorded_at" timestamp (3) with time zone NOT NULL,
	"accepted" boolean NOT NULL,
	"rejection_code" text,
	"geo_check_id" uuid,
	"idempotency_key" uuid NOT NULL,
	"request_fingerprint" text NOT NULL,
	"response_snapshot" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "attendance_attempts_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "attendance_direction" CHECK ("attendance_attempts"."direction" in ('ENTRY','EXIT'))
);
--> statement-breakpoint
CREATE TABLE "attendance_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"evaluated_at" timestamp (3) with time zone NOT NULL,
	"result" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"attempt_id" uuid,
	"kind" text NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL,
	"dedupe_key" text NOT NULL,
	CONSTRAINT "attendance_incidents_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "attendance_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"late_tolerance_minutes" integer NOT NULL,
	"early_entry_minutes" integer NOT NULL,
	"late_exit_minutes" integer NOT NULL,
	"activated_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "attendance_policies_version_unique" UNIQUE("version"),
	CONSTRAINT "attendance_policy_bounds" CHECK ("attendance_policies"."late_tolerance_minutes" between 0 and 120 and "attendance_policies"."early_entry_minutes" between 0 and 1440 and "attendance_policies"."late_exit_minutes" between 0 and 1440)
);
--> statement-breakpoint
CREATE TABLE "attendance_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "attendance_reason_length" CHECK (char_length(btrim("attendance_reasons"."reason")) between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"policy_snapshot" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "attendance_sessions_assignment_id_unique" UNIQUE("assignment_id")
);
--> statement-breakpoint
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_assignment_id_schedule_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."schedule_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_geo_check_id_geo_checks_id_fk" FOREIGN KEY ("geo_check_id") REFERENCES "public"."geo_checks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_evaluations" ADD CONSTRAINT "attendance_evaluations_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_incidents" ADD CONSTRAINT "attendance_incidents_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_incidents" ADD CONSTRAINT "attendance_incidents_assignment_id_schedule_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."schedule_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_incidents" ADD CONSTRAINT "attendance_incidents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_policies" ADD CONSTRAINT "attendance_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_reasons" ADD CONSTRAINT "attendance_reasons_incident_id_attendance_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."attendance_incidents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_reasons" ADD CONSTRAINT "attendance_reasons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_assignment_id_schedule_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."schedule_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_one_accepted_direction" ON "attendance_attempts" USING btree ("session_id","direction") WHERE "attendance_attempts"."accepted"=true;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_evaluation_once" ON "attendance_evaluations" USING btree ("session_id");
--> statement-breakpoint
-- Inicio del control automático: no se generan faltas para turnos anteriores a esta habilitación.
INSERT INTO attendance_policies (version, late_tolerance_minutes, early_entry_minutes, late_exit_minutes, activated_at)
VALUES (1, 10, 30, 120, clock_timestamp())
ON CONFLICT (version) DO NOTHING;
