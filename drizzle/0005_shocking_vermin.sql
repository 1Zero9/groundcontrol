CREATE TABLE "custom_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"colour" text,
	"feed_url" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "board_items" ADD COLUMN "custom_service_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "custom_service_id" uuid;--> statement-breakpoint
ALTER TABLE "custom_services" ADD CONSTRAINT "custom_services_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_items" ADD CONSTRAINT "board_items_custom_service_id_custom_services_id_fk" FOREIGN KEY ("custom_service_id") REFERENCES "public"."custom_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_custom_service_id_custom_services_id_fk" FOREIGN KEY ("custom_service_id") REFERENCES "public"."custom_services"("id") ON DELETE set null ON UPDATE no action;