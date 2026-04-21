ALTER TABLE "users" ADD COLUMN "slot_am" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "slot_pm" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "slot_eve" boolean DEFAULT false NOT NULL;