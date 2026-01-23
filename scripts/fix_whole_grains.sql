-- ============================================
-- WHOLE GRAIN BATCH UPDATE SCRIPT
-- Run this in Supabase SQL Editor
-- ============================================

-- Part 1: Mark all foods with whole grain patterns as is_whole_grain=true
UPDATE foods SET 
  is_whole_grain = true,
  usda_food_group = COALESCE(usda_food_group, 'whole_grain')
WHERE is_whole_grain IS NULL AND (
  -- English patterns
  LOWER(name) LIKE '%whole wheat%' OR
  LOWER(name) LIKE '%whole grain%' OR
  LOWER(name) LIKE '%100% wheat%' OR
  LOWER(name) LIKE '%multigrain%' OR
  -- Spanish patterns
  LOWER(name) LIKE '%integral%' OR
  LOWER(name) LIKE '%pan integral%' OR
  LOWER(name) LIKE '%arroz integral%' OR
  -- Oats
  LOWER(name) LIKE '%oat%' OR
  LOWER(name) LIKE '%avena%' OR
  LOWER(name) LIKE '%oatmeal%' OR
  -- Quinoa
  LOWER(name) LIKE '%quinoa%' OR
  LOWER(name) LIKE '%quinua%' OR
  -- Brown rice
  LOWER(name) LIKE '%brown rice%' OR
  LOWER(name) LIKE '%wild rice%' OR
  LOWER(name) LIKE '%arroz salvaje%' OR
  -- Bran
  LOWER(name) LIKE '%bran%' OR
  LOWER(name) LIKE '%salvado%' OR
  -- Ancient grains
  LOWER(name) LIKE '%farro%' OR
  LOWER(name) LIKE '%bulgur%' OR
  LOWER(name) LIKE '%barley%' OR
  LOWER(name) LIKE '%cebada%' OR
  LOWER(name) LIKE '%buckwheat%' OR
  LOWER(name) LIKE '%trigo sarraceno%' OR
  LOWER(name) LIKE '%millet%' OR
  LOWER(name) LIKE '%mijo%' OR
  LOWER(name) LIKE '%spelt%' OR
  LOWER(name) LIKE '%espelta%' OR
  LOWER(name) LIKE '%rye%' OR
  LOWER(name) LIKE '%centeno%' OR
  LOWER(name) LIKE '%sorghum%' OR
  LOWER(name) LIKE '%teff%' OR
  LOWER(name) LIKE '%amaranth%' OR
  LOWER(name) LIKE '%amaranto%'
);

-- Part 2: Mark refined grains as is_whole_grain=false
UPDATE foods SET 
  is_whole_grain = false,
  usda_food_group = COALESCE(usda_food_group, 'refined_grain')
WHERE is_whole_grain IS NULL AND (
  LOWER(name) LIKE '%white bread%' OR
  LOWER(name) LIKE '%white rice%' OR
  LOWER(name) LIKE '%pan blanco%' OR
  LOWER(name) LIKE '%arroz blanco%' OR
  LOWER(name) LIKE '%refined%' OR
  LOWER(name) LIKE '%refinado%' OR
  LOWER(name) LIKE '%bleached%' OR
  LOWER(name) LIKE '%enriched flour%'
);

-- Part 3: Show results
SELECT 
  is_whole_grain,
  usda_food_group,
  COUNT(*) as count
FROM foods 
WHERE is_whole_grain IS NOT NULL
GROUP BY is_whole_grain, usda_food_group
ORDER BY is_whole_grain DESC, count DESC;

-- Part 4: Show sample whole grains for verification
SELECT id, name, is_whole_grain, usda_food_group
FROM foods
WHERE is_whole_grain = true
LIMIT 20;
