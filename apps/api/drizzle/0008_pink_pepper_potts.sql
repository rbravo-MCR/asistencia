CREATE TABLE "leave_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"entitlements" jsonb NOT NULL,
	"administrative_weekdays" jsonb NOT NULL,
	"operational_weekdays" jsonb NOT NULL,
	"exclude_holidays" boolean NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "leave_policies_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'PENDING_HEAD' NOT NULL,
	"employee_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"partial_starts_at" timestamp (3) with time zone,
	"partial_ends_at" timestamp (3) with time zone,
	"vacation_period_year" integer,
	"days" integer DEFAULT 0 NOT NULL,
	"charged_dates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"policy_snapshot" jsonb,
	"permission_type_id" uuid,
	"permission_snapshot" jsonb,
	"incident_id" uuid,
	"original_request_id" uuid,
	"head_mode" text NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"resolved_at" timestamp (3) with time zone,
	CONSTRAINT "leave_requests_interval" CHECK ("leave_requests"."to_date" >= "leave_requests"."from_date"),
	CONSTRAINT "leave_request_kind" CHECK ("leave_requests"."kind" in ('VACATION','PERMISSION','JUSTIFICATION','CANCELLATION')),
	CONSTRAINT "leave_request_status" CHECK ("leave_requests"."status" in ('PENDING_HEAD','PENDING_DIRECTOR','APPROVED','REJECTED','WITHDRAWN','CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "permission_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"paid" boolean NOT NULL,
	"evidence_required" boolean NOT NULL,
	"allow_partial" boolean NOT NULL,
	"active" boolean NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"step" text NOT NULL,
	"decision" text NOT NULL,
	"reason" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"assignment_id" uuid,
	"authority_snapshot" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"content" "bytea" NOT NULL,
	CONSTRAINT "request_evidence_size" CHECK ("request_evidence"."size_bytes" between 1 and 1048576)
);
--> statement-breakpoint
CREATE TABLE "request_operations" (
	"idempotency_key" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"fingerprint" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vacation_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"anniversary_year" integer NOT NULL,
	"kind" text NOT NULL,
	"balance_delta" integer NOT NULL,
	"reserved_delta" integer NOT NULL,
	"reason" text NOT NULL,
	"request_id" uuid,
	"policy_id" uuid,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "vacation_movements_dedupe_key_unique" UNIQUE("dedupe_key"),
	CONSTRAINT "vacation_period_positive" CHECK ("vacation_movements"."anniversary_year" between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_permission_type_id_permission_types_id_fk" FOREIGN KEY ("permission_type_id") REFERENCES "public"."permission_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_incident_id_attendance_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."attendance_incidents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_original_request_id_leave_requests_id_fk" FOREIGN KEY ("original_request_id") REFERENCES "public"."leave_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_decisions" ADD CONSTRAINT "request_decisions_request_id_leave_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."leave_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_decisions" ADD CONSTRAINT "request_decisions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_evidence" ADD CONSTRAINT "request_evidence_request_id_leave_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."leave_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_operations" ADD CONSTRAINT "request_operations_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_movements" ADD CONSTRAINT "vacation_movements_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_movements" ADD CONSTRAINT "vacation_movements_request_id_leave_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."leave_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_movements" ADD CONSTRAINT "vacation_movements_policy_id_leave_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."leave_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_movements" ADD CONSTRAINT "vacation_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leave_requests_scope" ON "leave_requests" USING btree ("department_id","created_at");--> statement-breakpoint
CREATE INDEX "leave_requests_employee" ON "leave_requests" USING btree ("employee_id","from_date");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_incident_active_unique" ON "leave_requests" USING btree ("incident_id") WHERE "leave_requests"."kind"='JUSTIFICATION' and "leave_requests"."status" in ('PENDING_HEAD','PENDING_DIRECTOR','APPROVED');--> statement-breakpoint
CREATE UNIQUE INDEX "leave_cancellation_active_unique" ON "leave_requests" USING btree ("original_request_id") WHERE "leave_requests"."kind"='CANCELLATION' and "leave_requests"."status" in ('PENDING_HEAD','PENDING_DIRECTOR','APPROVED');--> statement-breakpoint
CREATE UNIQUE INDEX "permission_types_name" ON "permission_types" USING btree (lower(btrim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "request_decision_step_once" ON "request_decisions" USING btree ("request_id","step");--> statement-breakpoint
CREATE INDEX "vacation_movements_employee_period" ON "vacation_movements" USING btree ("employee_id","anniversary_year");