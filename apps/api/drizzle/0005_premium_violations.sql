CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"request_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"href" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp (3) with time zone,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outbox_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"href" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp (3) with time zone,
	CONSTRAINT "notifications_outbox_id_unique" UNIQUE("outbox_id"),
	CONSTRAINT "notifications_relative_href" CHECK ("notifications"."href" ~ '^/[^/]')
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"kind" text NOT NULL,
	"location_id" uuid,
	"template_version" integer NOT NULL,
	"starts_at" timestamp (3) with time zone NOT NULL,
	"ends_at" timestamp (3) with time zone NOT NULL,
	"modality" text NOT NULL,
	"time_zone" text NOT NULL,
	"template_name" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp (3) with time zone,
	"cancelled_at" timestamp (3) with time zone,
	"cancellation_reason" text,
	CONSTRAINT "schedule_interval" CHECK ("schedule_assignments"."ends_at" > "schedule_assignments"."starts_at"),
	CONSTRAINT "schedule_kind" CHECK ("schedule_assignments"."kind" in ('REGULAR','DUTY')),
	CONSTRAINT "schedule_status" CHECK ("schedule_assignments"."status" in ('DRAFT','PUBLISHED','CANCELLED')),
	CONSTRAINT "schedule_location" CHECK (("schedule_assignments"."modality" = 'ONSITE' and "schedule_assignments"."location_id" is not null) or ("schedule_assignments"."modality" = 'HOME_OFFICE' and "schedule_assignments"."location_id" is null)),
	CONSTRAINT "schedule_lifecycle" CHECK (("schedule_assignments"."status" = 'DRAFT' and "schedule_assignments"."published_at" is null and "schedule_assignments"."cancelled_at" is null) or ("schedule_assignments"."status" = 'PUBLISHED' and "schedule_assignments"."published_at" is not null and "schedule_assignments"."cancelled_at" is null) or ("schedule_assignments"."status" = 'CANCELLED' and "schedule_assignments"."cancelled_at" is not null and char_length(btrim("schedule_assignments"."cancellation_reason")) > 0))
);
--> statement-breakpoint
CREATE TABLE "shift_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "employee_category" NOT NULL,
	"modality" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"weekdays" jsonb NOT NULL,
	"time_zone" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"default_key" text,
	CONSTRAINT "shift_templates_default_key_unique" UNIQUE("default_key"),
	CONSTRAINT "shift_template_modality" CHECK (("shift_templates"."category" = 'OPERATIONAL' and "shift_templates"."modality" = 'HOME_OFFICE') or ("shift_templates"."category" = 'ADMINISTRATIVE' and "shift_templates"."modality" = 'ONSITE')),
	CONSTRAINT "shift_template_version" CHECK ("shift_templates"."version" > 0),
	CONSTRAINT "shift_template_times" CHECK ("shift_templates"."start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "shift_templates"."end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "shift_templates"."start_time" <> "shift_templates"."end_time")
);
--> statement-breakpoint
CREATE TABLE "geo_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"location_id" uuid,
	"result" text NOT NULL,
	"checked_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"distance_meters" double precision,
	"latitude" double precision,
	"longitude" double precision,
	"accuracy" double precision,
	"policy_snapshot" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "geo_checks_result" CHECK ("geo_checks"."result" in ('VALID','OUTSIDE_GEOFENCE','ACCURACY_INSUFFICIENT','LOCATION_REQUIRED','NO_AUTHORIZED_LOCATION','NOT_REQUIRED'))
);
--> statement-breakpoint
CREATE TABLE "location_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"revoked_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "location_authorizations_dates" CHECK ("location_authorizations"."ends_on" is null or "location_authorizations"."ends_on">="location_authorizations"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "work_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radius_meters" double precision DEFAULT 10 NOT NULL,
	"max_accuracy_meters" double precision DEFAULT 10 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_coordinates" CHECK ("work_locations"."latitude" between -90 and 90 and "work_locations"."longitude" between -180 and 180),
	CONSTRAINT "locations_policy" CHECK ("work_locations"."radius_meters">0 and "work_locations"."radius_meters"<=100000 and "work_locations"."max_accuracy_meters">0 and "work_locations"."max_accuracy_meters"<=100000),
	CONSTRAINT "locations_name" CHECK (char_length(btrim("work_locations"."name")) between 1 and 120)
);
--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_event_id_audit_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."audit_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_outbox_id_notification_outbox_id_fk" FOREIGN KEY ("outbox_id") REFERENCES "public"."notification_outbox"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_template_id_shift_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."shift_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_location_id_work_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."work_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_checks" ADD CONSTRAINT "geo_checks_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_checks" ADD CONSTRAINT "geo_checks_location_id_work_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."work_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_checks" ADD CONSTRAINT "geo_checks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_authorizations" ADD CONSTRAINT "location_authorizations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_authorizations" ADD CONSTRAINT "location_authorizations_location_id_work_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."work_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_authorizations" ADD CONSTRAINT "location_authorizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_created_idx" ON "audit_events" USING btree ("created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_outbox_event_recipient" ON "notification_outbox" USING btree ("event_id","recipient_id");--> statement-breakpoint
CREATE INDEX "notification_outbox_pending" ON "notification_outbox" USING btree ("created_at") WHERE "notification_outbox"."delivered_at" is null;--> statement-breakpoint
CREATE INDEX "notifications_user_created" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "holidays_date_unique" ON "holidays" USING btree ("date");--> statement-breakpoint
CREATE INDEX "schedule_employee_interval_idx" ON "schedule_assignments" USING btree ("employee_id","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "schedule_work_date_idx" ON "schedule_assignments" USING btree ("work_date");--> statement-breakpoint
CREATE INDEX "location_authorizations_employee_idx" ON "location_authorizations" USING btree ("employee_id");