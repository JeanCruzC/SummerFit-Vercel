-- ============================================================
-- Delete old non-USDA food entries
-- This removes the previous Spanish food database
-- Keeps only USDA foods (data_source = 'usda_sr' or 'usda_foundation')
-- ============================================================

-- First, check how many will be deleted
SELECT 
    COALESCE(data_source, 'NULL') as source,
    COUNT(*) as count
FROM foods 
GROUP BY data_source
ORDER BY count DESC;

-- Delete non-USDA foods
DELETE FROM foods 
WHERE data_source IS NULL 
   OR data_source = 'manual'
   OR data_source NOT LIKE 'usda%';

-- Verify remaining foods are only USDA
SELECT 
    data_source,
    COUNT(*) as remaining_foods
FROM foods 
GROUP BY data_source;
