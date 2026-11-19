CREATE TABLE "employee_number_counter" (
	"id" integer PRIMARY KEY NOT NULL,
	"last_value" numeric(30, 0) NOT NULL,
	CONSTRAINT "employee_number_counter_singleton" CHECK ("employee_number_counter"."id" = 1),
	CONSTRAINT "employee_number_counter_positive" CHECK ("employee_number_counter"."last_value" > 0)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_numeric" CHECK ("users"."username" is null or "users"."username" ~ '^[0-9]{1,30}$');