-- Enhance foods table with "Super" columns for AI enrichment
-- 0. Short description (Essential for "Simplification" view)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS description_es TEXT;

-- 1. Emojis for visual appeal
ALTER TABLE foods ADD COLUMN IF NOT EXISTS emoji TEXT;

-- 2. Search tags for better discoverability (e.g. ['desayuno', 'alto-proteina'])
ALTER TABLE foods ADD COLUMN IF NOT EXISTS search_tags TEXT[];

-- 3. Dietary flags (Auto-detected by AI)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS is_vegan BOOLEAN DEFAULT false;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS is_gluten_free BOOLEAN DEFAULT false;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS is_keto BOOLEAN DEFAULT false;

-- 4. Culinary Category (Clean high-level grouping)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS culinary_category TEXT;
