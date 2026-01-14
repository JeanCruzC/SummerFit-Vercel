-- Add description_es column to exercises table
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description_es TEXT;
