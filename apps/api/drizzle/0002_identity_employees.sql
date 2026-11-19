CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'HR', 'EMPLOYEE');--> statement-breakpoint
CREATE TYPE "public"."assignment_kind" AS ENUM('HEAD', 'DIRECTOR', 'SUBSTITUTE');--> statement-breakpoint
CREATE TYPE "public"."employee_category" AS ENUM('ADMINISTRATIVE', 'OPERATIONAL');--> statement-breakpoint
CREATE TYPE "public"."employment_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "recovery_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"used_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "organization_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "assignment_kind" NOT NULL,
	"employee_id" uuid NOT NULL,
	"department_id" uuid,
	"starts_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp (3) with time zone,
	"source_assignment_id" uuid,
	"reason" text NOT NULL,
	"created_by" uuid NOT NULL,
	"revoked_at" timestamp (3) with time zone,
	CONSTRAINT "assignments_department_kind" CHECK (("organization_assignments"."kind" = 'DIRECTOR' and "organization_assignments"."department_id" is null) or ("organization_assignments"."kind" <> 'DIRECTOR' and "organization_assignments"."department_id" is not null)),
	CONSTRAINT "assignments_interval" CHECK ("organization_assignments"."ends_at" is null or "organization_assignments"."ends_at" > "organization_assignments"."starts_at"),
	CONSTRAINT "assignments_substitute_finite" CHECK ("organization_assignments"."kind" <> 'SUBSTITUTE' or ("organization_assignments"."ends_at" is not null and "organization_assignments"."source_assignment_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_number" text NOT NULL,
	"full_name" text NOT NULL,
	"department_id" uuid NOT NULL,
	"position" text NOT NULL,
	"joined_on" date NOT NULL,
	"category" "employee_category" NOT NULL,
	"status" "employment_status" DEFAULT 'ACTIVE' NOT NULL,
	"supervisor_id" uuid,
	"user_id" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "employees_no_self_supervisor" CHECK ("employees"."supervisor_id" is null or "employees"."supervisor_id" <> "employees"."id"),
	CONSTRAINT "employees_number_length" CHECK (char_length(btrim("employees"."employee_number")) between 1 and 30),
	CONSTRAINT "employees_name_length" CHECK (char_length(btrim("employees"."full_name")) between 1 and 150),
	CONSTRAINT "employees_position_length" CHECK (char_length(btrim("employees"."position")) between 1 and 120)
);
--> statement-breakpoint
ALTER TABLE "recovery_tokens" ADD CONSTRAINT "recovery_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_assignments" ADD CONSTRAINT "organization_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_assignments" ADD CONSTRAINT "organization_assignments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_assignments" ADD CONSTRAINT "organization_assignments_source_assignment_id_organization_assignments_id_fk" FOREIGN KEY ("source_assignment_id") REFERENCES "public"."organization_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_assignments" ADD CONSTRAINT "organization_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_supervisor_id_employees_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_one_unused_per_user" ON "recovery_tokens" USING btree ("user_id","token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expiry_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_current_head" ON "organization_assignments" USING btree ("department_id") WHERE "organization_assignments"."kind" = 'HEAD' and "organization_assignments"."ends_at" is null and "organization_assignments"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_current_director" ON "organization_assignments" USING btree ("kind") WHERE "organization_assignments"."kind" = 'DIRECTOR' and "organization_assignments"."ends_at" is null and "organization_assignments"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "assignments_employee_idx" ON "organization_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_number_unique" ON "employees" USING btree (lower(btrim("employee_number")));--> statement-breakpoint
CREATE INDEX "employees_department_idx" ON "employees" USING btree ("department_id");