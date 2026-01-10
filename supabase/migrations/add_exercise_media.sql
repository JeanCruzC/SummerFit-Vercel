-- Migration: Add Exercise Media to Exercises Table
-- Description: Adds JSONB column to store images and videos for exercises

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS exercise_media JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN exercises.exercise_media IS 'Array of media objects {type: "image"|"video", url: string, order: number}';

-- Index for existing queries (optional, but good practice if we query by media presence later)
-- CREATE INDEX IF NOT EXISTS idx_exercises_has_media ON exercises((jsonb_array_length(exercise_media) > 0));
