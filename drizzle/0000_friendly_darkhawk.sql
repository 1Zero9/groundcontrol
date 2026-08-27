CREATE TYPE "public"."board_item_type" AS ENUM('note', 'task', 'reminder', 'countdown');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('active', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('adult', 'teen', 'child', 'pet');--> statement-breakpoint
CREATE TABLE "board_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"module_id" uuid,
	"text" text NOT NULL,
	"subtitle" text,
	"type" "board_item_type" DEFAULT 'note' NOT NULL,
	"person_ids" uuid[] DEFAULT '{}' NOT NULL,
	"expires_at" timestamp with time zone,
	"countdown_date" timestamp with time zone,
	"progress_current" integer,
	"progress_total" integer,
	"pinned" boolean DEFAULT false NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"badge" text,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"module_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone,
	"all_day" boolean DEFAULT false NOT NULL,
	"category" text NOT NULL,
	"person_ids" uuid[] DEFAULT '{}' NOT NULL,
	"location" text,
	"icon" text,
	"accent_color" text,
	"source" text,
	"source_id" text,
	"status" "event_status" DEFAULT 'active' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'Europe/Dublin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"colour" text NOT NULL,
	"avatar_emoji" text,
	"role" "member_role" DEFAULT 'child' NOT NULL,
	"title" text,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"is_core" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "board_items" ADD CONSTRAINT "board_items_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_items" ADD CONSTRAINT "board_items_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_modules" ADD CONSTRAINT "family_modules_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_modules" ADD CONSTRAINT "family_modules_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "family_module_unique" ON "family_modules" USING btree ("family_id","module_id");