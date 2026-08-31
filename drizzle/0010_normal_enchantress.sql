ALTER TABLE "events" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "snoozed_until" timestamp with time zone;