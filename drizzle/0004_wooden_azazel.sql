ALTER TABLE "admins" DROP COLUMN "password_hash";--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "google_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_google_id_unique" UNIQUE("google_id");
