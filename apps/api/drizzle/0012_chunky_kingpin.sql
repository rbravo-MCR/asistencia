ALTER TABLE "permission_types" ADD COLUMN "minimum_notice_hours" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "permission_types" ADD COLUMN "partial_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "permission_types" ADD CONSTRAINT "permission_notice_range" CHECK ("permission_types"."minimum_notice_hours" between 0 and 8760);--> statement-breakpoint
ALTER TABLE "permission_types" ADD CONSTRAINT "permission_partial_required" CHECK (not "permission_types"."partial_only" or "permission_types"."allow_partial");