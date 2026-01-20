-- Migration to add generated_by column to track merge sources
ALTER TABLE "foods" ADD COLUMN IF NOT EXISTS "generated_by" text DEFAULT NULL;
ALTER TABLE "foods" ADD COLUMN IF NOT EXISTS "is_user_preferred" boolean DEFAULT FALSE;
