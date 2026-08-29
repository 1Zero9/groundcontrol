ALTER TABLE "board_items" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_services" ADD COLUMN "person_ids" uuid[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN "nickname" text;--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN "last_seen_at" timestamp with time zone;