CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_name_length" CHECK (char_length("departments"."name") between 1 and 100),
	CONSTRAINT "departments_name_canonical" CHECK ("departments"."name" = normalize(btrim("departments"."name", U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'), NFC))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "departments_name_normalized_unique" ON "departments" USING btree (lower(btrim("name")));