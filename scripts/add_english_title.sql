-- Enable the extension required for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS title_en TEXT;

-- Create an index for faster search on the English title
CREATE INDEX IF NOT EXISTS idx_exercises_title_en ON exercises USING gin(title_en gin_trgm_ops);
