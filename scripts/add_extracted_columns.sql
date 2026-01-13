-- ============================================================
-- Add extracted columns to foods table
-- Adds: cooking_state, food_base
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Add new columns
ALTER TABLE foods 
ADD COLUMN IF NOT EXISTS cooking_state TEXT,
ADD COLUMN IF NOT EXISTS food_base TEXT;

-- Step 2: Extract food_base (first segment before comma)
UPDATE foods 
SET food_base = TRIM(SPLIT_PART(name, ',', 1))
WHERE food_base IS NULL;

-- Step 3: Extract cooking_state using pattern matching
UPDATE foods SET cooking_state = 'raw' 
WHERE LOWER(name) ~ '\braw\b' AND cooking_state IS NULL;

UPDATE foods SET cooking_state = 'cooked' 
WHERE LOWER(name) ~ '\bcooked\b' AND cooking_state IS NULL;

UPDATE foods SET cooking_state = 'frozen' 
WHERE LOWER(name) ~ '\bfrozen\b' AND cooking_state IS NULL;

UPDATE foods SET cooking_state = 'canned' 
WHERE LOWER(name) ~ '\bcanned\b' AND cooking_state IS NULL;

UPDATE foods SET cooking_state = 'dried' 
WHERE LOWER(name) ~ '\bdried\b' AND cooking_state IS NULL;

UPDATE foods SET cooking_state = 'roasted' 
WHERE LOWER(name) ~ '\broasted\b' AND cooking_state IS NULL;

UPDATE foods SET cooking_state = 'boiled' 
WHERE LOWER(name) ~ '\bboiled\b' AND cooking_state IS NULL;

UPDATE foods SET cooking_state = 'fried' 
WHERE LOWER(name) ~ '\bfried\b' AND cooking_state IS NULL;

UPDATE foods SET cooking_state = 'grilled' 
WHERE LOWER(name) ~ '\bgrilled\b' AND cooking_state IS NULL;

UPDATE foods SET cooking_state = 'baked' 
WHERE LOWER(name) ~ '\bbaked\b' AND cooking_state IS NULL;

UPDATE foods SET cooking_state = 'steamed' 
WHERE LOWER(name) ~ '\bsteamed\b' AND cooking_state IS NULL;

-- Step 4: Verify results
SELECT 
    cooking_state, 
    COUNT(*) as count 
FROM foods 
WHERE data_source LIKE 'usda%'
GROUP BY cooking_state 
ORDER BY count DESC;

SELECT 
    food_base, 
    COUNT(*) as count 
FROM foods 
WHERE data_source LIKE 'usda%'
GROUP BY food_base 
ORDER BY count DESC
LIMIT 30;
