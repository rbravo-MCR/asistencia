ALTER TABLE "leave_requests" ADD COLUMN "approval_flow" text DEFAULT 'HEAD_DIRECTOR' NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_requests" ALTER COLUMN "approval_flow" SET DEFAULT 'HEAD_ONLY';--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_request_approval_flow" CHECK ("leave_requests"."approval_flow" in ('HEAD_ONLY','HEAD_DIRECTOR'));--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_request_director_flow" CHECK ("leave_requests"."status" <> 'PENDING_DIRECTOR' or "leave_requests"."approval_flow" = 'HEAD_DIRECTOR');
