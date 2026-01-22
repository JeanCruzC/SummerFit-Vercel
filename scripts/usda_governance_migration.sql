-- ============================================================================
-- MIGRATION: Add USDA Governance Columns for Government-Grade Compliance
-- Date: 2026-01-21
-- Purpose: Enable complete USDA DGA validation with auditable data
-- ============================================================================

-- 1. USDA Food Group Classification
ALTER TABLE foods ADD COLUMN IF NOT EXISTS usda_food_group TEXT;
COMMENT ON COLUMN foods.usda_food_group IS 
'USDA food group: vegetables, fruits, dairy, protein, whole_grain, refined_grain, fat, condiment';

-- 2. Whole Grain Flag (required for grain servings calculation)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS is_whole_grain BOOLEAN DEFAULT false;
COMMENT ON COLUMN foods.is_whole_grain IS
'True if food contains ≥51% whole grains per USDA definition';

-- 3. USDA Serving Equivalents (grams per USDA serving)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS serving_equiv_grams NUMERIC;
COMMENT ON COLUMN foods.serving_equiv_grams IS
'Grams per USDA serving equivalent (e.g., 90g for 1 cup vegetables)';

-- 4. Processing Level (NOVA classification)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS processing_level TEXT DEFAULT 'minimally_processed';
COMMENT ON COLUMN foods.processing_level IS
'NOVA level: minimally_processed, processed, ultra_processed';

-- 5. Added Sugars (critical for USDA <10% limit)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS added_sugars_g_per_100g NUMERIC DEFAULT 0;
COMMENT ON COLUMN foods.added_sugars_g_per_100g IS
'Added sugars per 100g (excludes natural sugars from fruit/dairy)';

-- 6. Saturated Fat (critical for USDA <10% limit)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS sat_fat_g_per_100g NUMERIC DEFAULT 0;
COMMENT ON COLUMN foods.sat_fat_g_per_100g IS
'Saturated fat per 100g';

-- 7. Data Quality Audit Fields
ALTER TABLE foods ADD COLUMN IF NOT EXISTS data_quality_score NUMERIC DEFAULT 0;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS data_quality_flags JSONB DEFAULT '{}';
ALTER TABLE foods ADD COLUMN IF NOT EXISTS data_audited_at TIMESTAMP;

COMMENT ON COLUMN foods.data_quality_score IS
'0-100 score indicating data completeness and reliability';
COMMENT ON COLUMN foods.data_quality_flags IS
'JSON with flags: {ai_backfilled, estimated_fields, source_notes}';
COMMENT ON COLUMN foods.data_audited_at IS
'Last audit/backfill timestamp';

-- 8. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_foods_usda_group ON foods(usda_food_group);
CREATE INDEX IF NOT EXISTS idx_foods_whole_grain ON foods(is_whole_grain) WHERE is_whole_grain = true;
CREATE INDEX IF NOT EXISTS idx_foods_processing ON foods(processing_level);

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================
-- 
-- Check column addition:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'foods' AND column_name IN (
--   'usda_food_group', 'is_whole_grain', 'serving_equiv_grams', 
--   'processing_level', 'added_sugars_g_per_100g', 'sat_fat_g_per_100g',
--   'data_quality_score', 'data_quality_flags', 'data_audited_at'
-- );
--
-- Check data coverage:
-- SELECT 
--   COUNT(*) as total,
--   SUM(CASE WHEN usda_food_group IS NOT NULL THEN 1 ELSE 0 END) as has_usda_group,
--   SUM(CASE WHEN serving_equiv_grams > 0 THEN 1 ELSE 0 END) as has_serving_equiv,
--   SUM(CASE WHEN added_sugars_g_per_100g > 0 THEN 1 ELSE 0 END) as has_added_sugars
-- FROM foods WHERE food_tier IN (1, 2);
