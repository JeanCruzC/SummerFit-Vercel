-- ============================================================
-- Add display_name column with simplified food names
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Add display_name column
ALTER TABLE foods 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Step 2: Create function to clean USDA names
-- Logic: Remove cooking state, processing terms, and reformat

-- First, let's create a simplified name by:
-- 1. Taking first 2-3 segments
-- 2. Removing technical terms (enriched, fortified, etc)
-- 3. Reformatting order (e.g., "Rice, white" → "White rice")

UPDATE foods 
SET display_name = (
    CASE 
        -- If name has commas (USDA format), simplify it
        WHEN name LIKE '%,%' THEN
            -- Get first 2 segments and clean them
            INITCAP(
                TRIM(
                    REGEXP_REPLACE(
                        -- Remove cooking states and processing terms from first 2 segments
                        REGEXP_REPLACE(
                            SPLIT_PART(name, ',', 1) || 
                            CASE 
                                WHEN SPLIT_PART(name, ',', 2) != '' 
                                    AND LOWER(SPLIT_PART(name, ',', 2)) NOT IN (' raw', ' cooked', ' frozen', ' canned', ' dried', ' roasted', ' boiled', ' fried', ' grilled', ' baked', ' steamed')
                                    AND LOWER(SPLIT_PART(name, ',', 2)) NOT LIKE '% raw%'
                                    AND LOWER(SPLIT_PART(name, ',', 2)) NOT LIKE '% cooked%'
                                    AND LOWER(SPLIT_PART(name, ',', 2)) NOT LIKE '%enriched%'
                                    AND LOWER(SPLIT_PART(name, ',', 2)) NOT LIKE '%unenriched%'
                                    AND LOWER(SPLIT_PART(name, ',', 2)) NOT LIKE '%fortified%'
                                THEN ', ' || TRIM(SPLIT_PART(name, ',', 2))
                                ELSE ''
                            END,
                            ',\s*(enriched|unenriched|fortified|with added.*|without added.*|separable.*|trimmed.*|boneless|bone-in)', 
                            '', 
                            'gi'
                        ),
                        '\s+', ' ', 'g'
                    )
                )
            )
        -- No commas, keep as is
        ELSE INITCAP(name)
    END
)
WHERE display_name IS NULL AND data_source LIKE 'usda%';

-- Step 3: Special cleanup for common patterns
-- Clean up double spaces and trailing commas
UPDATE foods 
SET display_name = TRIM(TRAILING ', ' FROM REGEXP_REPLACE(display_name, '\s+', ' ', 'g'))
WHERE data_source LIKE 'usda%';

-- Step 4: Verify results
SELECT 
    name as original_name,
    display_name,
    food_base,
    cooking_state
FROM foods 
WHERE data_source LIKE 'usda%'
  AND name LIKE '%Rice%'
ORDER BY LENGTH(display_name)
LIMIT 20;
