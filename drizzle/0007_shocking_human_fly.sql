CREATE TYPE "public"."module_request_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "module_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"requested_by_name" text,
	"title" text NOT NULL,
	"reason" text,
	"status" "module_request_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "colour" text;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "is_custom" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "module_requests" ADD CONSTRAINT "module_requests_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;