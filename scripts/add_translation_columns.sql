-- Add translation columns to foods table
ALTER TABLE foods ADD COLUMN IF NOT EXISTS name_es TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS category_es TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS serving_description_es TEXT;

-- Add language preference to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'es';

-- Create an index to speed up searches by spanish name
CREATE INDEX IF NOT EXISTS foods_name_es_idx ON foods(name_es);
