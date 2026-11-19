ALTER TABLE "employees" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_phone_format" CHECK ("employees"."phone_number" is null or "employees"."phone_number" ~ '^[+]?[0-9]{7,15}$');--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_address_length" CHECK ("employees"."address" is null or char_length("employees"."address") between 1 and 500);